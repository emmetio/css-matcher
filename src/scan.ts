import Scanner, { isWhiteSpace, isQuote } from '@emmetio/scanner';

interface ScanState {
    /** Start location of currently consumed token */
    start: number;

    /** End location of currently consumed token */
    end: number;

    /** Indicates we are inside CSS property */
    property: boolean;
}

export type ScanCallback = (value: string, type: TokenType, start: number, end: number, delimiter: number) => false | any;

export const enum TokenType {
    Selector = 'selector',
    PropertyName = 'propertyName',
    PropertyValue = 'propertyValue',
    BlockEnd = 'blockEnd',
}

export const enum Chars {
    /** `{` character */
    LeftCurly = 123,
    /** `}` character */
    RightCurly = 125,
    /** `*` character */
    Asterisk = 42,
    /** `/` character */
    Slash = 47,
    /** `:` character */
    Colon = 58,
    /** `;` character */
    Semicolon = 59,
    /** `\\` character */
    Backslash = 92,

    LF = 10,
    CR = 13,
}

/**
 * Performs fast scan of given stylesheet (CSS, LESS, SCSS) source code and runs
 * callback for each token and its range found. The goal of this parser is to quickly
 * determine document structure: selector, property, value and block end.
 * It doesn’t provide detailed info about CSS atoms like compound selectors,
 * operators, quoted string etc. to reduce memory allocations: this data can be
 * parsed later on demand.
 */
export default function scan(source: string, callback: ScanCallback) {
    const scanner = new Scanner(source);
    const state: ScanState = {
        start: -1,
        end: -1,
        property: false,
    };
    let blockEnd: boolean;

    const notify = (type: TokenType, delimiter = scanner.start) => {
        const value = scanner.substring(state.start, state.end);
        const shouldStop = callback(value, type, state.start, state.end, delimiter) === false;
        reset(state);
        return shouldStop;
    };

    while (!scanner.eof()) {
        if (comment(scanner) || whitespace(scanner)) {
            continue;
        }

        scanner.start = scanner.pos;
        if ((blockEnd = scanner.eat(Chars.RightCurly)) || scanner.eat(Chars.Semicolon)) {
            // Block or property end
            if (state.start === -1 && state.property) {
                // Explicit property value state: emit empty value
                state.start = state.end = scanner.start;
            }

            if (state.start !== -1) {
                // Flush consumed token
                if (notify(state.property ? TokenType.PropertyValue : TokenType.PropertyName)) {
                    return;
                }
            }

            if (blockEnd) {
                state.start = scanner.start;
                state.end = scanner.pos;

                if (notify(TokenType.BlockEnd)) {
                    return;
                }
            }
        } else if (scanner.eat(Chars.LeftCurly)) {
            // Block start
            if (state.start === -1) {
                // No consumed selector, emit empty value as selector start
                state.start = state.end = scanner.pos;
            }

            if (notify(TokenType.Selector)) {
                return;
            }
        } else if (scanner.eat(Chars.Colon)) {
            const property = state.start !== -1;
            if (state.start !== -1 && notify(TokenType.PropertyName)) {
                return;
            }
            state.property = property;
        } else {
            if (state.start === -1) {
                state.start = scanner.pos;
            }

            if (!literal(scanner)) {
                scanner.pos++;
            }

            state.end = scanner.pos;
        }
    }

    if (state.start !== -1) {
        // There’s pending token in state
        notify(state.property ? TokenType.PropertyValue : TokenType.PropertyName, -1);
    }
}

function whitespace(scanner: Scanner): boolean {
    return scanner.eatWhile(isWhiteSpace);
}

/**
 * Consumes CSS comments from scanner: `/*  * /`
 * It’s possible that comment may not have closing part
 */
function comment(scanner: Scanner): boolean {
    const start = scanner.pos;
    if (scanner.eat(Chars.Slash) && scanner.eat(Chars.Asterisk)) {
        scanner.start = start;
        while (!scanner.eof()) {
            if (scanner.eat(Chars.Asterisk)) {
                if (scanner.eat(Chars.Slash)) {
                    return true;
                }
                continue;
            }
            scanner.pos++;
        }
        return true;
    } else {
        scanner.pos = start;
    }

    return false;
}

/**
 * Consumes single- or double-quoted string literal
 */
function literal(scanner: Scanner) {
    const ch = scanner.peek();
    if (isQuote(ch)) {
        scanner.start = scanner.pos++;
        while (!scanner.eof()) {
            if (scanner.eat(ch) || scanner.eat(Chars.LF) || scanner.eat(Chars.CR)) {
                break;
            }

            // Skip escape character, if any
            scanner.eat(Chars.Backslash);
            scanner.pos++;
        }

        // Do not throw if string is incomplete
        return true;
    }
}

function reset(state: ScanState) {
    state.start = state.end = -1;
    state.property = false;
}

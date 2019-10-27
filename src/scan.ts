import Scanner, { isQuote, isSpace } from '@emmetio/scanner';

interface ScanState {
    /** Start location of currently consumed token */
    start: number;

    /** End location of currently consumed token */
    end: number;

    /** Location of possible property delimiter */
    propertyDelimiter: number;

    /** Location of possible property start */
    propertyStart: number;

    /** Location of possible property end */
    propertyEnd: number;

    /** In expression context  */
    expression: number;
}

export type ScanCallback = (type: TokenType, start: number, end: number, delimiter: number) => false | any;

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
    /** `(` character */
    LeftRound = 40,
    /** `)` character */
    RightRound = 41,

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
        propertyStart: -1,
        propertyEnd: -1,
        propertyDelimiter: -1,
        expression: 0,
    };
    let blockEnd: boolean;

    const notify = (type: TokenType, delimiter = scanner.start, start = state.start, end = state.end) => {
        return callback(type, start, end, delimiter) === false;
    };

    while (!scanner.eof()) {
        if (comment(scanner) || whitespace(scanner)) {
            continue;
        }

        scanner.start = scanner.pos;
        if ((blockEnd = scanner.eat(Chars.RightCurly)) || scanner.eat(Chars.Semicolon)) {
            // Block or property end
            if (state.propertyStart !== -1) {
                // We have pending property
                if (notify(TokenType.PropertyName, state.propertyDelimiter, state.propertyStart, state.propertyEnd)) {
                    return;
                }

                if (state.start === -1) {
                    // Explicit property value state: emit empty value
                    state.start = state.end = scanner.start;
                }

                if (notify(TokenType.PropertyValue)) {
                    return;
                }
            } else if (state.start !== -1 && notify(TokenType.PropertyName)) {
                // Flush consumed token
                return;
            }

            if (blockEnd) {
                state.start = scanner.start;
                state.end = scanner.pos;

                if (notify(TokenType.BlockEnd)) {
                    return;
                }
            }

            reset(state);
        } else if (scanner.eat(Chars.LeftCurly)) {
            // Block start
            if (state.start === -1 && state.propertyStart === -1) {
                // No consumed selector, emit empty value as selector start
                state.start = state.end = scanner.pos;
            }

            if (state.propertyStart !== -1) {
                // Now we know that value that looks like property name-value pair
                // was actually a selector
                state.start = state.propertyStart;
            }

            if (notify(TokenType.Selector)) {
                return;
            }
            reset(state);
        } else if (scanner.eat(Chars.Colon) && !isKnownSelectorColon(scanner, state)) {
            // Colon could be one of the following:
            // — property delimiter: `foo: bar`, must be in block context
            // — variable delimiter: `$foo: bar`, could be anywhere
            // — pseudo-selector: `a:hover`, could be anywhere (for LESS and SCSS)
            // — media query expression: `min-width: 100px`, must be inside expression context
            // Since I can’t easily detect `:` meaning for sure, we’ll update state
            // to accumulate possible property name-value pair or selector
            if (state.propertyStart === -1) {
                state.propertyStart = state.start;
            }
            state.propertyEnd = state.end;
            state.propertyDelimiter = scanner.pos - 1;
            state.start = state.end = -1;
        } else {
            if (state.start === -1) {
                state.start = scanner.pos;
            }

            if (scanner.eat(Chars.LeftRound)) {
                state.expression++;
            } else if (scanner.eat(Chars.RightRound)) {
                state.expression--;
            } else if (!literal(scanner)) {
                scanner.pos++;
            }

            state.end = scanner.pos;
        }
    }

    if (state.propertyStart !== -1) {
        // Pending property name
        if (notify(TokenType.PropertyName, state.propertyDelimiter, state.propertyStart, state.propertyEnd)) {
            return;
        }
    }

    if (state.start !== -1) {
        // There’s pending token in state
        notify(state.propertyStart !== -1 ? TokenType.PropertyValue : TokenType.PropertyName, -1);
    }
}

function whitespace(scanner: Scanner): boolean {
    return scanner.eatWhile(isSpace);
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
export function literal(scanner: Scanner) {
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
    state.start = state.end = state.propertyStart = state.propertyEnd = state.propertyDelimiter = -1;
}

/**
 * Check if current state is a known selector context for `:` delimiter
 */
function isKnownSelectorColon(scanner: Scanner, state: ScanState) {
    // Either inside expression like `(min-width: 10px)` or pseudo-element `::before`
    return state.expression || scanner.eatWhile(Chars.Colon);
}

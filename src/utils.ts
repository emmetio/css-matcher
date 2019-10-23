export type ScanCallback = (value: string, type: TokenType, start: number, end: number) => false | any;

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

/** Options for `Scanner` utils */
export const opt = { throws: false };

/**
 * Converts given string into array of character codes
 */
export function toCharCodes(str: string): number[] {
    return str.split('').map(ch => ch.charCodeAt(0));
}

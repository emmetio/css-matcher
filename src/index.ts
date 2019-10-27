import scan, { TokenType } from './scan';
import { isSpace } from '@emmetio/scanner';

export { default as scan, TokenType, ScanCallback } from './scan';
export { splitValue } from './parse';

export type Range = [number, number];
export type MatchType = 'selector' | 'property';
type TokenRange = [number, number, number];

export interface MatchResult {
    type: MatchType;
    start: number;
    end: number;
    bodyStart: number;
    bodyEnd: number;
}

interface InwardRange {
    start: number;
    end: number;
    delimiter: number;
    firstChild: InwardRange | null;
}

export default function match(source: string, pos: number): MatchResult | null {
    const pool: TokenRange[] = [];
    const stack: TokenRange[] = [];
    let result: MatchResult | null = null;
    let pendingProperty: TokenRange | null = null;

    const releasePending = () => {
        if (pendingProperty) {
            releaseRange(pool, pendingProperty);
            pendingProperty = null;
        }
    };

    scan(source, (type, start, end, delimiter) => {
        if (type === TokenType.Selector) {
            releasePending();
            stack.push(allocRange(pool, start, end, delimiter));
        } else if (type === TokenType.BlockEnd) {
            releasePending();
            const parent = stack.pop();
            if (parent && parent[0] < pos && pos < end) {
                result = {
                    type: 'selector',
                    start: parent[0],
                    end,
                    bodyStart: parent[2] + 1,
                    bodyEnd: start
                };
                return false;
            }
        } else if (type === TokenType.PropertyName) {
            releasePending();
            pendingProperty = allocRange(pool, start, end, delimiter);
        } else if (type === TokenType.PropertyValue) {
            if (pendingProperty && pendingProperty[0] < pos && pos < end) {
                result = {
                    type: 'property',
                    start: pendingProperty[0],
                    end: delimiter + 1,
                    bodyStart: start,
                    bodyEnd: end
                };
                return false;
            }
            releasePending();
        }
    });
    return result;
}

/**
 * Returns balanced CSS model: a list of all ranges that could possibly match
 * given location when moving in outward direction
 */
export function balancedOutward(source: string, pos: number): Range[] {
    const pool: TokenRange[] = [];
    const stack: TokenRange[] = [];
    const result: Range[] = [];
    let property: TokenRange | null = null;

    scan(source, (type, start, end, delimiter) => {
        if (type === TokenType.Selector) {
            stack.push(allocRange(pool, start, end, delimiter));
        } else if (type === TokenType.BlockEnd) {
            const left = stack.pop();
            if (left && left[0] < pos && end > pos) {
                // Matching section found
                const inner = innerRange(source, left[2] + 1, start);
                inner && push(result, inner);
                push(result, [left[0], end]);
            }
            left && releaseRange(pool, left);
            if (!stack.length) {
                return false;
            }
        } else if (type === TokenType.PropertyName) {
            property && releaseRange(pool, property);
            property = allocRange(pool, start, end, delimiter);
        } else if (type === TokenType.PropertyValue) {
            if (property && property[0] < pos && Math.max(delimiter, end) > pos) {
                // Push full token and value range
                push(result, [start, end]);
                push(result, [property[0], delimiter !== -1 ? delimiter + 1 : end]);
            }
        }

        if (type !== TokenType.PropertyName && property) {
            releaseRange(pool, property);
            property = null;
        }
    });

    return result;
}

/**
 * Returns balanced CSS selectors: a list of all ranges that could possibly match
 * given location when moving in inward direction
 */
export function balancedInward(source: string, pos: number): Range[] {
    // Collecting ranges for inward balancing is a bit trickier: we have to store
    // first child of every matched selector until we find the one that matches given
    // location
    const pool: InwardRange[] = [];
    const stack: InwardRange[] = [];
    const result: Range[] = [];
    let pendingProperty: InwardRange | null = null;

    const alloc = (start: number, end: number, delimiter: number): InwardRange => {
        if (pool.length) {
            const range = pool.pop()!;
            range.start = start;
            range.end = end;
            range.delimiter = delimiter;
            return range;
        }

        return { start, end, delimiter, firstChild: null };
    };

    const release = (range: InwardRange) => {
        range.firstChild = null;
        pool.push(range);
    };

    const releasePending = () => {
        if (pendingProperty) {
            release(pendingProperty);
            pendingProperty = null;
        }
    };

    /**
     * Pushes given inward range as a first child of current selector only if it’s
     * not set yet
     */
    const pushChild = (start: number, end: number, delimiter: number) => {
        const parent = last(stack);
        if (parent && !parent.firstChild) {
            parent.firstChild = alloc(start, end, delimiter);
        }
    };

    scan(source, (type, start, end, delimiter) => {
        if (type === TokenType.BlockEnd) {
            releasePending();

            let range = stack.pop()!;
            if (!range) {
                // Some sort of lone closing brace, ignore it
                return;
            }

            if (range.start <= pos && pos <= end) {
                // Matching selector found: add it and its inner range into result
                let inner = innerRange(source, range.delimiter + 1, start);
                push(result, [range.start, end]);
                inner && push(result, inner);

                while (range.firstChild) {
                    const child = range.firstChild;

                    inner = innerRange(source, child.delimiter + 1, child.end - 1);
                    push(result, [child.start, child.end]);
                    inner && push(result, inner);
                    range = child;
                }

                return false;
            } else {
                const parent = last(stack);
                if (parent && !parent.firstChild) {
                    // No first child in parent node: store current selector
                    range.end = end;
                    parent.firstChild = range;
                } else {
                    release(range);
                }
            }
        } else if (type === TokenType.PropertyName) {
            releasePending();
            pendingProperty = alloc(start, end, delimiter);
            pushChild(start, end, delimiter);
        } else if (type === TokenType.PropertyValue) {
            if (pendingProperty) {
                if (pendingProperty.start <= pos && end >= pos) {
                    // Direct hit into property, no need to look further
                    push(result, [pendingProperty.start, delimiter + 1]);
                    push(result, [start, end]);
                    releasePending();
                    return false;
                }

                const parent = last(stack);
                if (parent && parent.firstChild && parent.firstChild.start === pendingProperty.start) {
                    // First child is an expected property name, update its range
                    // to include property value
                    parent.firstChild.end = delimiter !== -1 ? delimiter + 1 : end;
                }

                releasePending();
            }
        } else {
            // Selector start
            stack.push(alloc(start, end, delimiter));
            releasePending();
        }
    });

    stack.length = pool.length = 0;
    return result;
}

/**
 * Returns inner range for given selector bounds: narrows it to first non-empty
 * region. If resulting region is empty, returns `null`
 */
function innerRange(source: string, start: number, end: number): Range | null {
    while (start < end && isSpace(source.charCodeAt(start))) {
        start++;
    }

    while (end > start && isSpace(source.charCodeAt(end - 1))) {
        end--;
    }

    return start !== end ? [start, end] : null;
}

function allocRange(pool: TokenRange[], start: number, end: number, delimiter: number): TokenRange {
    if (pool.length) {
        const range = pool.pop()!;
        range[0] = start;
        range[1] = end;
        range[2] = delimiter;
        return range;
    }
    return [start, end, delimiter];
}

function releaseRange(pool: TokenRange[], range: TokenRange | null) {
    range && pool.push(range);
    return null;
}

function push(ranges: Range[], range: Range) {
    const prev = ranges.length ? ranges[ranges.length - 1] : null;
    if ((!prev || prev[0] !== range[0] || prev[1] !== range[1]) && range[0] !== range[1]) {
        ranges.push(range);
    }
}

function last<T>(arr: T[]): T | null {
    return arr.length ? arr[arr.length - 1] : null;
}

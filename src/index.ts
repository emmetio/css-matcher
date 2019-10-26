import scan, { TokenType } from './scan';
import { isSpace } from '@emmetio/scanner';

export { default as scan, TokenType, ScanCallback } from './scan';

export type Range = [number, number];
type TokenRange = [number, number, number];

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
                const inner = innerSelector(source, left[2] + 1, start);
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
 * Returns inner range for given selector bounds: narrows it to first non-empty
 * region. If resulting region is empty, returns `null`
 */
function innerSelector(source: string, start: number, end: number): Range | null {
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
    const last = ranges.length ? ranges[ranges.length - 1] : null;
    if ((!last || last[0] !== range[0] || last[1] !== range[1]) && range[0] !== range[1]) {
        ranges.push(range);
    }
}

import scan, { TokenType } from './scan';

export { default as scan, TokenType, ScanCallback } from './scan';

type Range = [number, number];
type TokenRange = [number, number, number];

/**
 * Returns balanced CSS model: a list of all ranges that could possibly match
 * given location when moving in outward direction
 */
export function balancedOutward(source: string, pos: number): Range[] {
    const pool: TokenRange[] = [];
    const stack: TokenRange[] = [];
    const result: Range[] = [];
    let property: Range | null = null;

    scan(source, (value, type, start, end, delimiter) => {
        if (type === TokenType.Selector) {
            stack.push(allocRange(pool, start, end, delimiter));
        } else if (type === TokenType.BlockEnd) {
            const left = stack.pop();
            if (left && left[0] < pos && end > pos) {
                // Matching section found
                const right = allocRange(pool, start, end, delimiter);
                pushSection(result, source, left, right);
                releaseRange(pool, right);
            }
            left && releaseRange(pool, left);
            if (!stack.length) {
                return false;
            }
        }
    });

    return result;
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

function releaseRange(pool: TokenRange[], range: TokenRange) {
    pool.push(range);
}

function pushSection(tokens: Range[], source: string, start: TokenRange, end: TokenRange) {
    // TODO implement
}

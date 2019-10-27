import Scanner, { isSpace } from '@emmetio/scanner';
import { literal, Chars } from './scan';

type Token = [number, number];

const enum Operator {
    Plus = 43,
    Minus = 45,
    Division = 47,
    Multiplication = 42,
    Comma = 44,
}

// NB: no `Minus` operator, it must be handled differently
const operators: Operator[] = [
    Operator.Plus, Operator.Division, Operator.Multiplication,
    Operator.Comma
];

/**
 * Splits given CSS value into token list
 */
export function splitValue(value: string): Token[] {
    let offset = -1;
    let expression = 0;
    let pos = 0;
    const result: Token[] = [];
    const scanner = new Scanner(value);

    while (!scanner.eof()) {
        pos = scanner.pos;
        if (scanner.eat(isSpace) || scanner.eat(isOperator) || isMinusOperator(scanner)) {
            // Use space as value delimiter but only if not in expression context,
            // e.g. `1 2` are distinct values but `(1 2)` not
            if (!expression && offset !== -1) {
                result.push([offset, pos]);
                offset = -1;
            }
            scanner.eatWhile(isSpace);
        } else {
            if (offset === -1) {
                offset = scanner.pos;
            }

            if (scanner.eat(Chars.LeftRound)) {
                expression++;
            } else if (scanner.eat(Chars.RightRound)) {
                expression--;
            } else if (!literal(scanner)) {
                scanner.pos++;
            }
        }
    }

    if (offset !== -1 && offset !== scanner.pos) {
        result.push([offset, scanner.pos]);
    }

    return result;
}

function isOperator(ch: number) {
    return operators.includes(ch);
}

/**
 * Check if current scanner state is at minus operator
 */
function isMinusOperator(scanner: Scanner): boolean {
    // Minus operator is tricky since CSS supports dashes in keyword names like
    // `no-repeat`
    const start = scanner.pos;
    if (scanner.eat(Operator.Minus) && scanner.eat(isSpace)) {
        return true;
    }

    scanner.pos = start;
    return false;
}

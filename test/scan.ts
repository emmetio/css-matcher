import { deepStrictEqual as deepEqual } from 'assert';
import scan, { TokenType } from '../src/scan';

type Token = [string, TokenType, number, number, number];

function tokens(str: string): Token[] {
    const result: Token[] = [];
    scan(str, (value, type, start, end, delimiter) => result.push([value, type, start, end, delimiter]));
    return result;
}

describe('Scanner', () => {
    it('selectors', () => {
        deepEqual(tokens('a {}'), [
            ['a', 'selector', 0, 1, 2],
            ['}', 'blockEnd', 3, 4, 3]
        ]);
        deepEqual(tokens('a { foo: bar; }'), [
            ['a', 'selector', 0, 1, 2],
            ['foo', 'propertyName', 4, 7, 7],
            ['bar', 'propertyValue', 9, 12, 12],
            ['}', 'blockEnd', 14, 15, 14]
        ]);
        deepEqual(tokens('a { b{} }'), [
            ['a', 'selector', 0, 1, 2],
            ['b', 'selector', 4, 5, 5],
            ['}', 'blockEnd', 6, 7, 6],
            ['}', 'blockEnd', 8, 9, 8]
        ]);

        deepEqual(tokens('a {:;}'), [
            ['a', 'selector', 0, 1, 2],
            ['}', 'blockEnd', 5, 6, 5]
        ]);

        deepEqual(tokens('a + b.class[attr="}"] { }'), [
            ['a + b.class[attr="}"]', 'selector', 0, 21, 22],
            ['}', 'blockEnd', 24, 25, 24]
        ]);

        deepEqual(tokens('a /* b */ { foo: bar; }'), [
            ['a', 'selector', 0, 1, 10],
            ['foo', 'propertyName', 12, 15, 15],
            ['bar', 'propertyValue', 17, 20, 20],
            ['}', 'blockEnd', 22, 23, 22]
        ]);
    });

    it('property', () => {
        deepEqual(tokens('a'), [
            ['a', 'propertyName', 0, 1, -1]
        ]);

        deepEqual(tokens('a:b'), [
            ['a', 'propertyName', 0, 1, 1],
            ['b', 'propertyValue', 2, 3, -1]
        ]);

        deepEqual(tokens('a:b;;'), [
            ['a', 'propertyName', 0, 1, 1],
            ['b', 'propertyValue', 2, 3, 3]
        ]);

        deepEqual(tokens('a { b: c; d: e; }'), [
            ['a', 'selector', 0, 1, 2],
            ['b', 'propertyName', 4, 5, 5],
            ['c', 'propertyValue', 7, 8, 8],
            ['d', 'propertyName', 10, 11, 11],
            ['e', 'propertyValue', 13, 14, 14],
            ['}', 'blockEnd', 16, 17, 16]
        ]);

        deepEqual(tokens('a { foo: bar "baz}" ; }'), [
            ['a', 'selector', 0, 1, 2],
            ['foo', 'propertyName', 4, 7, 7],
            ['bar "baz}"', 'propertyValue', 9, 19, 20],
            ['}', 'blockEnd', 22, 23, 22]
        ]);
    });

    it.only('pseudo-selectors', () => {
        console.log(tokens('\na:hover { foo: bar "baz}" ; }'));

    });
});

import { deepStrictEqual as deepEqual } from 'assert';
import scan from '../src/scan';
import { TokenType } from '../src/utils';

type Token = [string, TokenType, number, number];

function tokens(str: string): Token[] {
    const result: Token[] = [];
    scan(str, (value, type, start, end) => result.push([value, type, start, end]));
    return result;
}

describe('Scanner', () => {
    it('selectors', () => {
        deepEqual(tokens('a {}'), [
            ['a', 'selector', 0, 1],
            ['}', 'blockEnd', 3, 4]
        ]);
        deepEqual(tokens('a { foo: bar; }'), [
            ['a', 'selector', 0, 1],
            ['foo', 'propertyName', 4, 7],
            ['bar', 'propertyValue', 9, 12],
            ['}', 'blockEnd', 14, 15]
        ]);
        deepEqual(tokens('a { b{} }'), [
            ['a', 'selector', 0, 1],
            ['b', 'selector', 4, 5],
            ['}', 'blockEnd', 6, 7],
            ['}', 'blockEnd', 8, 9]
        ]);

        deepEqual(tokens('a {:;}'), [
            ['a', 'selector', 0, 1],
            ['}', 'blockEnd', 5, 6]
        ]);

        deepEqual(tokens('a + b.class[attr="}"] { }'), [
            ['a + b.class[attr="}"]', 'selector', 0, 21],
            ['}', 'blockEnd', 24, 25]
        ]);

        deepEqual(tokens('a /* b */ { foo: bar; }'), [
            ['a', 'selector', 0, 1],
            ['foo', 'propertyName', 12, 15],
            ['bar', 'propertyValue', 17, 20],
            ['}', 'blockEnd', 22, 23]
        ]);
    });

    it('property', () => {
        deepEqual(tokens('a'), [
            ['a', 'propertyName', 0, 1]
        ]);

        deepEqual(tokens('a:b'), [
            ['a', 'propertyName', 0, 1],
            ['b', 'propertyValue', 2, 3]
        ]);

        deepEqual(tokens('a:b;;'), [
            ['a', 'propertyName', 0, 1],
            ['b', 'propertyValue', 2, 3]
        ]);

        deepEqual(tokens('a { b: c; d: e; }'), [
            ['a', 'selector', 0, 1],
            ['b', 'propertyName', 4, 5],
            ['c', 'propertyValue', 7, 8],
            ['d', 'propertyName', 10, 11],
            ['e', 'propertyValue', 13, 14],
            ['}', 'blockEnd', 16, 17]
        ]);

        deepEqual(tokens('a { foo: bar "baz}" ; }'), [
            ['a', 'selector', 0, 1],
            ['foo', 'propertyName', 4, 7],
            ['bar "baz}"', 'propertyValue', 9, 19],
            ['}', 'blockEnd', 22, 23]
        ]);
    });
});

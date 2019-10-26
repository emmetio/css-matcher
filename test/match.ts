import { deepStrictEqual as deepEqual } from 'assert';
import fs from 'fs';
import path from 'path';
import match from '../src';

const scssPath = path.resolve(__dirname, './samples/sample.scss');
const code = fs.readFileSync(scssPath, 'utf8');

describe('Matcher', () => {
    it('match selector', () => {
        deepEqual(match(code, 63), {
            type: 'selector',
            start: 61,
            end: 198,
            bodyStart: 66,
            bodyEnd: 197
        });

        deepEqual(match(code, 208), {
            type: 'selector',
            start: 204,
            end: 267,
            bodyStart: 209,
            bodyEnd: 266
        });
    });

    it('property', () => {
        deepEqual(match(code, 140), {
            type: 'property',
            start: 137,
            end: 150,
            bodyStart: 145,
            bodyEnd: 149
        });
    });
});

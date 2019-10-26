import { deepStrictEqual as deepEqual } from 'assert';
import fs from 'fs';
import path from 'path';
import { balancedOutward } from '../src';

const scssPath = path.resolve(__dirname, './samples/sample.scss');
const code = fs.readFileSync(scssPath, 'utf8');

describe('Balance', () => {
    it('outward', () => {
        deepEqual(balancedOutward(code, 140), [
            [145, 149],
            [137, 150],
            [110, 182],
            [75, 192],
            [61, 198],
            [43, 281],
            [0, 283]
        ]);

        deepEqual(balancedOutward(code, 77), [
            [110, 182],
            [75, 192],
            [61, 198],
            [43, 281],
            [0, 283]
        ]);

        deepEqual(balancedOutward(code, 277), [
            [273, 281],
            [43, 281],
            [0, 283]
        ]);
    });
});

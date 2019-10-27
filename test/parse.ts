import { deepStrictEqual as deepEqual } from 'assert';
import { splitValue } from '../src/parse';

function tokens(value: string) {
    return splitValue(value).map(range => value.substring(range[0], range[1]));
}

describe('Parse CSS fragments', () => {
    it('split value', () => {
        deepEqual(tokens('10px 20px'), ['10px', '20px']);
        deepEqual(tokens(' 10px   20px  '), ['10px', '20px']);
        deepEqual(tokens('10px, 20px'), ['10px', '20px']);
        deepEqual(tokens('20px'), ['20px']);
        deepEqual(tokens('no-repeat, 10px - 5'), ['no-repeat', '10px', '5']);
        deepEqual(tokens('url("foo bar") no-repeat'), ['url("foo bar")', 'no-repeat']);
        deepEqual(tokens('--my-prop'), ['--my-prop']);
        deepEqual(tokens('calc(100% - 80px)'), ['calc(100% - 80px)']);
    });
});

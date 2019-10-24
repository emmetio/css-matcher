// import { deepStrictEqual as deepEqual } from 'assert';
import { balancedOutward, Range } from '../src';

type RangeFragment = [number, number, string];

const code = `
@media (min-width: 900px) and screen {
    $width: 20px;
    foo {
        .bar[title="Enable"] {
            padding: 10px;
            margin: 20px;
            position: absolute;
        }
    }

    div {
        font-weight: bold;
        font-size: 12px;
    }

    .empty{}
}

blockquote.incut {
    margin: 20px 10px;
}
`;

function withFragment(range: Range): RangeFragment {
    return [range[0], range[1], code.substring(range[0], range[1])];
}

describe('Balance', () => {
    it('outward', () => {
        console.log(balancedOutward(code, 140).map(withFragment));

    });
});

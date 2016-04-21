Testing Framework For Ruff.

GitHub <https://github.com/vilic/ruff-t>

## Install

```sh
rap install t
```

## Usage

**test.js**

```js
require('t');

describe('A scope', function () {
    it('should pass', function (done) {
        setTimeout(done, 100);
    });

    it('should fail', function () {
        throw new Error();
    });
});
```

Run `ruff test.js`.

## License

MIT License.

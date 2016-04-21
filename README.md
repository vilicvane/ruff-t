Testing Framework for Ruff.

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
    before(function () {
        // Before all tests in this scope.
    });

    after(function () {
        // After all tests in this scope.
    });

    beforeEach(function () {
        // Before each test in this scope.
    });

    afterEach(function () {
        // After each test in this scope.
    });

    it('should pass', function (done) {
        setTimeout(done, 100);
    });

    it('should fail', function () {
        throw new Error();
    });

    describe('A sub scope', function () {
        // Sub scope.

        it('should pass', function () { });
    });
});
```

Run `ruff test.js` to execute the test.

Handlers passed to `before`, `after`, `beforeEach`, `afterEach` and `it` can be synchronous or asynchronous:

- If a `done` (name does not matter) parameter exists, T will wait for it to be called. An error object can be passed in just like Mocha.
- Otherwise, T will try to resolve the return value and if it's a promise, T respects its result.

## License

MIT License.

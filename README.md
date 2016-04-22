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

describe('Some scope', function () {
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

    it('should pass immediately', function () { });

    it('should fail immediately', function () {
        throw new Error();
    });

    describe('Some subscope', function () {
        it('should pass immediately', function () { });

        it('should fail immediately', function () {
            throw new Error();
        });
    });

    it('should pass in 100 ms (callback)', function (done) {
        setTimeout(done, 100);
    });

    it('should fail in 100 ms (callback)', function (done) {
        setTimeout(function () {
            done(new Error());
        }, 100);
    });

    it('should pass in 100 ms (promise)', function () {
        return Promise.resolve();
    });

    it('should fail in 100 ms (promise)', function () {
        return Promise.reject(new Error());
    });

    describe('Some subscope', function (scope) {
        // Set timeout (default to 2000 ms).
        scope.timeout = 200;

        it('should pass then fail due to multiple invocations of `done`', function (done) {
            done();
            done();
        });

        it('should fail due to an uncaught exception during this test', function (done) {
            setTimeout(function () {
                throw new Error();
            }, 100);
        });

        it('should fail due to time out', function (done) { });
    });
});
```

Run `ruff test.js` to execute the test.

Handlers passed to `before`, `after`, `beforeEach`, `afterEach` and `it` can be synchronous or asynchronous:

- If a `done` (name does not matter) parameter exists, T will wait for it to be called. An error object can be passed in just like Mocha.
- Otherwise, T will try to resolve the return value and if it's a promise, T respects its result.

## License

MIT License.

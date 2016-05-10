if (typeof Promise !== 'function') {
    require('promise');
}

import * as Path from 'path';
import * as Util from 'util';

import { stylize, indent, delay } from './utils';

export type DoneCallback = (error?: any) => void;
export type ScopeHandler = (scope: Scope) => void;
export type GeneralHandler = (done?: DoneCallback) => Promise<void> | void;

type UncaughtExceptionHandler = (error: any) => void;

export interface ErrorItem {
    description: string;
    error: any;
}

export interface Stats {
    passed: number;
    failed: number;
}

export const enum TestState {
    pending,
    passed,
    failed,
    skipped
}

const fulfilled = Promise.resolve();
const pending = new Promise<void>(() => { });

export const options = {
    timeout: 2000
};

export class ErrorCollector {
    items: ErrorItem[] = [];

    add(description: string, error: any): number {
        return this.items.push({
            description,
            error
        });
    }

    print(): void {
        let items = this.items;

        for (let i = 0; i < items.length; i++) {
            let item = items[i];

            console.log('\n' + indent(`${i + 1}) ${item.description}`, 1));
            console.log('\n' + indent(stylize(getErrorOutput(item.error), 'gray'), 1));
        }
    }

    get empty(): boolean {
        return this.items.length === 0;
    }
}

export abstract class Runnable {
    depth: number;
    description: string;

    constructor(
        public upper: Runnable
    ) {
        this.depth = upper && upper.depth + 1 || 0;
    }

    abstract run(index: number, runnables: Runnable[]): Promise<void>;

    print(...objects: any[]): void {
        if (objects.length) {
            let first = objects[0];

            if (typeof first === 'string') {
                first = indent(first, this.depth);
            }

            console.log(first, ...objects.slice(1));
        } else {
            console.log('');
        }
    }

    get fullDescription(): string {
        let descriptions: string[] = [];
        let node: Runnable = this;

        while (node.upper) {
            descriptions.unshift(node.description);
            node = node.upper;
        }

        return descriptions.join(' > ');
    }
}

export class Test extends Runnable {
    state = TestState.pending;
    depth: number;
    upper: Scope;

    constructor(
        scope: Scope,
        public handler: GeneralHandler,
        public description: string
    ) {
        super(scope);
    }

    run(index: number, runnables: (Scope | Test)[]): Promise<void> {
        return new Promise<void>(resolve => {
            let timer = setTimeout(() => handleError(new Error('Test timed out')), this.upper.timeout);

            let handleSuccess = () => {
                if (this.state !== TestState.pending) {
                    return;
                }

                clearTimeout(timer);

                this.state = TestState.passed;

                this.print(stylize('>', 'green'), stylize(this.description, 'gray'));

                resolve();
            };

            let handleError = (error: any) => {
                if (this.state === TestState.failed) {
                    return;
                }

                clearTimeout(timer);

                this.state = TestState.failed;

                let count = this.upper.errorCollector.add(this.fullDescription, error);
                this.print(stylize(count + ')', 'red'), stylize(this.description, 'red'));

                resolve();
            };

            activeUncaughtExceptionHandler = handleError;

            let handler = this.handler;

            if (handler.length) {
                let called = false;

                try {
                    handler(error => {
                        if (called) {
                            handleError(new Error('Callback `done` is called multiple times'));
                            return;
                        }

                        called = true;

                        if (error) {
                            handleError(error);
                        } else {
                            handleSuccess();
                        }
                    });
                } catch (error) {
                    handleError(error);
                }
            } else {
                let resolvableResult: Promise<void> | void;

                try {
                    resolvableResult = handler();

                    if (resolvableResult === undefined) {
                        handleSuccess();
                    } else {
                        Promise
                            .resolve(resolvableResult)
                            .then(() => {
                                handleSuccess();
                            }, reason => {
                                handleError(reason);
                            })
                    }
                } catch (error) {
                    handleError(error);
                }
            }
        });
    }
}

export class Scope extends Runnable {
    runnables: (Scope | Test)[] = [];
    timeout = options.timeout;

    private _beforeHandler: GeneralHandler;
    private _beforeEachHandler: GeneralHandler;

    private _afterHandler: GeneralHandler;
    private _afterEachHandler: GeneralHandler;

    constructor(
        upper: Scope,
        public errorCollector: ErrorCollector,
        public description: string
    ) {
        super(upper);
    }

    get stats(): Stats {
        let passed = 0;
        let failed = 0;

        for (let runnable of this.runnables) {
            if (runnable instanceof Scope) {
                let stats = runnable.stats;

                passed += stats.passed;
                failed += stats.failed;
            } else {
                switch (runnable.state) {
                    case TestState.passed:
                        passed++;
                        break;
                    case TestState.failed:
                        failed++;
                        break;
                }
            }
        }

        return {
            passed,
            failed
        };
    }

    get hasTests(): boolean {
        for (let runnable of this.runnables) {
            if (runnable instanceof Scope) {
                if (runnable.hasTests) {
                    return true;
                }
            } else {
                return true;
            }
        }

        return false;
    }

    run(index: number, runnables: (Scope | Test)[]): Promise<void> {
        if (this.upper && this.hasTests) {
            this.print(stylize(this.description, 'bold'));
        }

        return fulfilled
            .then(() => invokeOptionalGeneralCallback(this._beforeHandler))
            .then(() => {
                return this.runnables.reduce((promise, runnable, index, runnables) => {
                    return promise
                        .then(() => invokeOptionalGeneralCallback(this._beforeEachHandler))
                        .catch(reason => exitWithError(reason))
                        .then(() => runnable.run(index, runnables))
                        .then(() => invokeOptionalGeneralCallback(this._afterEachHandler))
                        .catch(reason => exitWithError(reason));
                }, fulfilled);
            })
            .then(() => invokeOptionalGeneralCallback(this._afterHandler));
    }

    describe(description: string, handler: ScopeHandler): void {
        if (activeScope !== this) {
            throw new Error('Cannot create a child scope as current scope is not active');
        }

        let originalScope = this;

        activeScope = new Scope(this, this.errorCollector, description);

        this.runnables.push(activeScope);

        handler(activeScope);

        activeScope = this;
    }

    it(description: string, handler: GeneralHandler): void {
        if (activeScope !== this) {
            throw new Error('Cannot add a test as current scope is not active');
        }

        this.runnables.push(new Test(this, handler, description));
    }

    before(handler: GeneralHandler): void {
        if (this._beforeHandler) {
            throw new Error('`before` handler already set');
        }

        this._beforeHandler = handler;
    }

    beforeEach(handler: GeneralHandler): void {
        if (this._beforeEachHandler) {
            throw new Error('`beforeEach` handler already set');
        }

        this._beforeEachHandler = handler;
    }

    after(handler: GeneralHandler): void {
        if (this._afterHandler) {
            throw new Error('`after` handler already set');
        }

        this._afterHandler = handler;
    }

    afterEach(handler: GeneralHandler): void {
        if (this._afterEachHandler) {
            throw new Error('`afterEach` handler already set');
        }

        this._afterEachHandler = handler;
    }
}

let activeScope: Scope;
let activeUncaughtExceptionHandler: UncaughtExceptionHandler;

process.on('uncaughtException', (error: any) => {
    if (activeUncaughtExceptionHandler) {
        try {
            activeUncaughtExceptionHandler(error);
        } catch (error) {
            exitWithError(error);
        }
    } else {
        exitWithError(error);
    }
});

export function describe(description: string, handler: ScopeHandler): void {
    activeScope.describe(description, handler);
}

export function it(description: string, handler: GeneralHandler): void {
    activeScope.it(description, handler);
}

export function before(handler: GeneralHandler): void {
    activeScope.before(handler);
}

export function beforeEach(handler: GeneralHandler): void {
    activeScope.beforeEach(handler);
}

export function after(handler: GeneralHandler): void {
    activeScope.after(handler);
}

export function afterEach(handler: GeneralHandler): void {
    activeScope.afterEach(handler);
}

let globalExports = ['describe', 'it', 'before', 'beforeEach', 'after', 'afterEach'];

for (let key of globalExports) {
    Object.defineProperty(global, key, { value: exports[key] });
}

let errorCollector = new ErrorCollector();
let rootScope = new Scope(undefined, errorCollector, 'ROOT');

activeScope = rootScope;

let started = false;

setTimeout(start, 0);

function start() {
    started = true;

    console.log('');

    return activeScope
        .run(0, [rootScope])
        // Delay for multiple `done` check.
        .then(() => delay(0))
        .then(() => {
            console.log('\n');

            let { passed, failed } = rootScope.stats;

            if (passed || !failed) {
                console.log(indent(stylize(`${passed} passing`, 'green'), 1));
            }

            if (failed) {
                console.log(indent(stylize(`${failed} failing`, 'red'), 1));
            }

            rootScope.errorCollector.print();
            console.log('\n');

            return delay(200);
        })
        .then(() => {
            if (rootScope.errorCollector.empty) {
                process.exit(0)
            } else {
                process.exit(1);
            }
        });
}

export function queue(path: string): void {
    if (started) {
        exitWithError(new Error('Test has already been started'));
        return;
    }

    require(Path.resolve(path));
}

function invokeOptionalGeneralCallback(handler: GeneralHandler): Promise<void> {
    if (handler) {
        if (handler.length) {
            return new Promise<void>((resolve, reject) => {
                handler(error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        } else {
            return fulfilled.then(() => handler());
        }
    } else {
        return fulfilled;
    }
}

function exitWithError(error: any): void {
    console.error(getErrorOutput(error));
    process.exit(1);
}

function getErrorOutput(error: any): string {
    if (error instanceof Error) {
        return error.stack;
    } else {
        return Util.inspect(error);
    }
}

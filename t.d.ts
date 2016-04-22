import {
    ScopeHandler,
    GeneralHandler
} from '../bld/';

export declare function describe(description: string, handler: ScopeHandler): void;
export declare function it(description: string, handler: GeneralHandler): void;
export declare function before(handler: GeneralHandler): void;
export declare function beforeEach(handler: GeneralHandler): void;
export declare function after(handler: GeneralHandler): void;
export declare function afterEach(handler: GeneralHandler): void;

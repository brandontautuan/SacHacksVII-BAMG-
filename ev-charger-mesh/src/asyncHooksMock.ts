// This is a minimal mock for `node:async_hooks` so that @langchain can run in the browser.
export class AsyncLocalStorage {
    getStore() {
        return undefined;
    }
    run(store: any, callback: () => void) {
        return callback();
    }
}

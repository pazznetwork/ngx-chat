export class TimeoutError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'TimeoutError';
    }
}

export function delay(ms: number) {
    let localDelay;
    const promise = new Promise(resolve => {
        localDelay = setTimeout(resolve, ms);
    });
    (promise as any).timeout = localDelay;
    return promise;
}

export function timeout(promise: Promise<any>, ms: number) {
    const promiseDelay = delay(ms);

    // eslint-disable-next-line unicorn/consistent-function-scoping
    function cancelDelay() {
        clearTimeout((promiseDelay as any).timeout);
    }

    return Promise.race([
        (promise as any).finally(cancelDelay),
        promiseDelay.then(() => {
            throw new TimeoutError();
        }),
    ]);
}

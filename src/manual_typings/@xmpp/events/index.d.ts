declare module '@xmpp/events' {

    export function timeout<T>(promise: Promise<T>, timeoutInMS: number): Promise<T>;

    export class EventEmitter {
        addListener(event: string | symbol, listener: (...args: any[]) => void): this;

        on(event: string | symbol, listener: (...args: any[]) => void): this;

        once(event: string | symbol, listener: (...args: any[]) => void): this;

        removeListener(event: string | symbol, listener: (...args: any[]) => void): this;

        removeAllListeners(event?: string | symbol): this;

        setMaxListeners(n: number): this;

        getMaxListeners(): number;

        listeners(event: string | symbol): Function[]; // tslint:disable-line:ban-types
        emit(event: string | symbol, ...args: any[]): boolean;

        listenerCount(type: string | symbol): number;

        // Added in Node 6...
        prependListener(event: string | symbol, listener: (...args: any[]) => void): this;

        prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;

        eventNames(): Array<string | symbol>;
    }

}

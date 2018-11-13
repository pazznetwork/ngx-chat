declare module '@xmpp/client-core' {

    import { Element } from 'ltx';

    export class Client {

        public timeout: number;

        public reconnect: Reconnect;

        public iqCaller: IqCaller;

        public startOptions: StartOptions;

        public plugins: any;

        public on(eventName: string, callback: any): void;

        public handle(eventName: string, callback: any): void;

        public write(message: string): void;

        public start(options: StartOptions): void;

        public stop(): void;

        public send(content: any): PromiseLike<void>;

        public plugin(plugin: any): void;

        public removeAllListeners(): void;

    }

    export interface StartOptions {
        uri: string;
        domain: string;
    }

    export interface Reconnect {

        stop(): void;

    }

    export interface IqCaller {

        request(stanza: Element): Promise<Element>;

    }

}

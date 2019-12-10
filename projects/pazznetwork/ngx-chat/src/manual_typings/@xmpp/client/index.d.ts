declare module '@xmpp/client' {

    import { EventEmitter } from '@xmpp/events';
    import { Element } from 'ltx';

    export class Client {

        public timeout: number;

        public reconnect: Reconnect;

        public iqCaller: IqCaller;

        public plugins: any;

        public status: string;

        public on(eventName: string, callback: any): void;

        public handle(eventName: string, callback: any): void;

        public write(message: string): void;

        public start(): Promise<void>;

        public stop(): void;

        public send(content: any): PromiseLike<void>;

        public plugin(plugin: any): void;

        public removeAllListeners(): void;

    }

    export function client(clientConf: ClientConfiguration): Client;

    export function xml(name: string, attrs?: { [key: string]: string }, ...content: any[]): Element;

    export interface ClientConfiguration {
        service: string;
        domain: string;
        resource?: string;
        username?: string;
        password?: string;
        credentials?: (auth: (config: { username: string; password: string; }) => Promise<void>, mechanism: any) => Promise<void>;
    }

    export interface Reconnect extends EventEmitter {

        stop(): void;

        reconnect(): void;

    }

    export interface IqCaller {

        request(stanza: Element): Promise<Element>;

    }

}

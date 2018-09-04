declare module '@xmpp/client-core' {

    export class Client {

        public timeout: number;

        public startOptions: { uri: string, domain: string };

        public on(eventName: string, callback: any): void;

        public handle(eventName: string, callback: any): void;

        public write(message: string): void;

        public start(options: StartOptions): void;

        public stop(): void;

        public send(content: any): PromiseLike<void>;

        public plugin(plugin: any): void;

    }

    export interface StartOptions {
        uri: string;
        domain: string;
    }

}

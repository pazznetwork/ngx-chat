declare module '@xmpp/client' {

    import { Client } from '@xmpp/client-core';

    export function client(...args): Client;

}

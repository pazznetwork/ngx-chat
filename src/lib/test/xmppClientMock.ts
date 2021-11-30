import { Client } from '@xmpp/client';
import { LogInRequest } from '../core/log-in-request';
import { XmppClientFactoryService } from '../services/adapters/xmpp/xmpp-client-factory.service';
import SpyObj = jasmine.SpyObj;

export function createXmppClientMock(): SpyObj<Client> {
    const spyObj = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin', 'send', 'start', 'handle']);
    spyObj.send.and.callFake(() => Promise.resolve());
    return spyObj;
}

export class MockClientFactory implements XmppClientFactoryService {

    clientInstance: SpyObj<Client>;

    constructor() {
        this.clientInstance = createXmppClientMock();
    }

    client(logInRequest?: LogInRequest): SpyObj<Client> {
        return this.clientInstance;
    }

}

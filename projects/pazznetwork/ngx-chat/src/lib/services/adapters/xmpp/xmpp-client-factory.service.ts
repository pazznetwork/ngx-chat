import { Injectable } from '@angular/core';
import { Client, client } from '@xmpp/client';
import { LogInRequest } from '../../../core';

@Injectable()
export class XmppClientFactoryService {

    client(logInRequest: LogInRequest): Client {
        return client(logInRequest);
    }

}

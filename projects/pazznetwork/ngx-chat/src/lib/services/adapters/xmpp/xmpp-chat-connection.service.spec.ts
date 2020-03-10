import { TestBed } from '@angular/core/testing';
import { testLogService } from '../../../test/log-service';

import { MockClientFactory } from '../../../test/xmppClientMock';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { XmppChatConnectionService } from './xmpp-chat-connection.service';
import { XmppClientFactoryService } from './xmpp-client-factory.service';

describe('chat connection service', () => {

    let chatConnectionService;
    let xmppClientMock;

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        xmppClientMock = mockClientFactory.clientInstance;

        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
    });

    it('#getNextIqId() should generate new iq ids', () => {
        expect(chatConnectionService.getNextIqId())
            .not.toEqual(chatConnectionService.getNextIqId(), 'two consecutive iq ids should not match');
    });

});

import { TestBed } from '@angular/core/testing';
import { testLogService } from '../../../test/logService';

import { createXmppClientMock } from '../../../test/xmppClientMock';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { XmppChatConnectionService } from './xmpp-chat-connection.service';

describe('chat connection service', () => {

    let chatConnectionService;
    let xmppClientMock;

    beforeEach(() => {
        xmppClientMock = xmppClientMock = createXmppClientMock();

        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
    });

    it('#getNextIqId() should generate new iq ids', () => {
        expect(chatConnectionService.getNextIqId())
            .not.toEqual(chatConnectionService.getNextIqId(), 'two consecutive iq ids should not match');
    });

});

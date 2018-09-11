import { TestBed } from '@angular/core/testing';
import { x as xml } from '@xmpp/xml';
import { first } from 'rxjs/operators';
import { testLogService } from '../../../test/logService';

import { createXmppClientMock } from '../../../test/xmppClientMock';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { XmppChatConnectionService, XmppClientToken } from './xmpp-chat-connection.service';

describe('chat connection service', () => {

    let chatConnectionService;
    let contactFactory;
    let xmppClientMock;

    beforeEach(() => {
        xmppClientMock = xmppClientMock = createXmppClientMock();

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientMock},
                XmppChatConnectionService,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        contactFactory = TestBed.get(ContactFactoryService);
    });

    it('#getNextIqId() should generate new iq ids', () => {
        expect(chatConnectionService.getNextIqId())
            .not.toEqual(chatConnectionService.getNextIqId(), 'two consecutive iq ids should not match');
    });

});

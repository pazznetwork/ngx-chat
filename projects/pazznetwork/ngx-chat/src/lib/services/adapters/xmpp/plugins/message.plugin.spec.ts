import { TestBed } from '@angular/core/testing';
import { xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { first } from 'rxjs/operators';
import { testLogService } from '../../../../test/log-service';
import { MockClientFactory } from '../../../../test/xmppClientMock';
import { ChatServiceToken } from '../../../chat-service';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService } from '../xmpp-chat-connection.service';
import { XmppClientFactoryService } from '../xmpp-client-factory.service';
import { MessagePlugin } from './message.plugin';

describe('message plugin', () => {

    let chatService: XmppChatAdapter;
    let chatConnectionService: XmppChatConnectionService;

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        const xmppClientMock = mockClientFactory.clientInstance;

        const logService = testLogService();
        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                {provide: ChatServiceToken, useClass: XmppChatAdapter},
                {provide: LogService, useValue: logService},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        chatConnectionService.userJid = new JID('me', 'example.com', 'something');
        chatService = TestBed.get(ChatServiceToken);
        chatService.addPlugins([new MessagePlugin(chatService, logService)]);
    });

    it('should emit events on receiving a message', async (done) => {
        chatConnectionService.stanzaUnknown$
            .pipe(first())
            .subscribe(async (stanza) => {
                await expect(stanza.getChildText('body')).toEqual('message text');
                done();
            });
        await chatConnectionService.onStanzaReceived(
            xml('message', {from: 'someone@example.com'},
                xml('body', {}, 'message text')));
    });

});

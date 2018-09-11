import { TestBed } from '@angular/core/testing';
import { JID } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { first } from 'rxjs/operators';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ChatServiceToken } from '../../../chat-service';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { MessagePlugin } from './message.plugin';

describe('message plugin', () => {

    let chatService: XmppChatAdapter;
    let chatConnectionService: XmppChatConnectionService;

    beforeEach(() => {
        const xmppClientMock = createXmppClientMock();

        const logService = testLogService();
        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientMock},
                XmppChatConnectionService,
                {provide: ChatServiceToken, useClass: XmppChatAdapter},
                {provide: LogService, useValue: logService},
                ContactFactoryService
            ]
        });

        chatService = TestBed.get(ChatServiceToken);
        chatConnectionService = TestBed.get(XmppChatConnectionService);
        chatService.addPlugins([new MessagePlugin(chatService, logService)]);
        chatConnectionService.userJid = new JID('me', 'example.com', 'something');
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

import { TestBed } from '@angular/core/testing';
import { jid as parseJid, xml } from '@xmpp/client';
import { first, isEmpty, timeoutWith } from 'rxjs/operators';
import { testLogService } from '../../../../test/log-service';
import { MockClientFactory } from '../../../../test/xmppClientMock';
import { ChatServiceToken } from '../../../chat-service';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService } from '../xmpp-chat-connection.service';
import { XmppClientFactoryService } from '../xmpp-client-factory.service';
import { MessagePlugin, MessageReceivedEvent } from './message.plugin';
import { Direction } from '../../../../core/message';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import Spy = jasmine.Spy;
import { EMPTY } from 'rxjs';

describe('message plugin', () => {
    let chatAdapter: XmppChatAdapter;
    let chatConnectionService: XmppChatConnectionService;
    let messagePlugin: MessagePlugin;
    let dummyPlugin: AbstractXmppPlugin;

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

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        chatConnectionService.userJid = parseJid('me', 'example.com', 'something');
        chatAdapter = TestBed.inject(ChatServiceToken) as XmppChatAdapter;
        messagePlugin = new MessagePlugin(chatAdapter, logService);
        dummyPlugin = new (class DummyPlugin extends AbstractXmppPlugin {
        })();
        chatAdapter.addPlugins([messagePlugin, dummyPlugin]);
    });

    it('should process received messages', async () => {
        const currentTime = new Date().getTime();
        const someUserJid = parseJid('someone@example.com');
        spyOn(dummyPlugin, 'afterReceiveMessage').and.callThrough();

        const contactFromMessageObservablePromise = chatAdapter.message$.pipe(first()).toPromise();

        const messageStanza = xml('message', {from: someUserJid.toString(), to: chatConnectionService.userJid.toString()},
            xml('body', {}, 'message text'));
        await chatConnectionService.onStanzaReceived(messageStanza);

        const contactFromMessageObservable = await contactFromMessageObservablePromise;
        expect(contactFromMessageObservable.jidBare.equals(someUserJid)).toBeTrue();

        const contacts = chatAdapter.contacts$.getValue();
        expect(contacts.length).toBe(1);

        const someContact = contacts[0];
        expect(someContact.jidBare.equals(someUserJid)).toBeTrue();
        expect(someContact).toBe(contactFromMessageObservable);

        const messages = someContact.messages;
        expect(messages.length).toBe(1);
        expect(messages[0].body).toBe('message text');
        expect(messages[0].direction).toBe(Direction.in);
        expect(messages[0].datetime.getTime()).toBeGreaterThanOrEqual(currentTime);
        expect(messages[0].datetime.getTime()).toBeLessThan(currentTime + 20, 'incoming message should be processed within 20ms');
        expect(messages[0].delayed).toBeFalse();
        expect(messages[0].fromArchive).toBeFalse();

        expect(dummyPlugin.afterReceiveMessage).toHaveBeenCalledOnceWith(messages[0], messageStanza, jasmine.any(MessageReceivedEvent));
    });

    it('should process received messages when they were delayed', async () => {
        const delay = '2021-08-17T15:33:25.375401Z';
        const someUserJid = parseJid('someone@example.com');

        await chatConnectionService.onStanzaReceived(
            xml('message', {from: someUserJid.toString(), to: chatConnectionService.userJid.toString()},
                xml('delay', {stamp: delay}),
                xml('body', {}, 'message text')));

        const someContact = chatAdapter.contacts$.getValue()[0];
        expect(someContact.jidBare.equals(someUserJid)).toBeTrue();

        const messages = someContact.messages;
        expect(messages.length).toBe(1);
        expect(messages[0].datetime).toEqual(new Date(delay));
        expect(messages[0].delayed).toBeTrue();
        expect(messages[0].fromArchive).toBeFalse();
    });

    it('should discard messages if another plugin decides that they have to be discarded', async () => {
        const someUserJid = parseJid('someone@example.com');

        spyOn(messagePlugin, 'handleStanza').and.callThrough();

        const messageStanza = xml('message', {from: someUserJid.toString(), to: chatConnectionService.userJid.toString()},
            xml('body', {}, 'message text'));

        spyOn(dummyPlugin, 'afterReceiveMessage').and.callFake((message, stanza, event) => {
            if (stanza === messageStanza) {
                event.discard = true;
            }
        });

        await chatConnectionService.onStanzaReceived(messageStanza);

        expect(messagePlugin.handleStanza).toHaveBeenCalledOnceWith(messageStanza);
        expect((messagePlugin.handleStanza as Spy<typeof messagePlugin.handleStanza>).calls.mostRecent().returnValue).toBeTrue();
        expect(dummyPlugin.afterReceiveMessage)
            .toHaveBeenCalledOnceWith(jasmine.any(Object), messageStanza, jasmine.any(MessageReceivedEvent));
        expect(chatAdapter.contacts$.getValue().length).toBe(0);
    });

    it('should ignore group chat messages', async (done) => {
        const groupChatJid = parseJid('chatroom@conference.example.com/mynick');

        spyOn(messagePlugin, 'handleStanza').and.callThrough();
        spyOn(dummyPlugin, 'afterReceiveMessage').and.callThrough();

        const groupChatStanza = xml('message', {
                from: groupChatJid.toString(),
                to: chatConnectionService.userJid.toString(),
                type: 'groupchat'
            },
            xml('body', {}, 'message text'));

        chatConnectionService.stanzaUnknown$.pipe(first()).subscribe((unhandledStanza) => {
            expect(unhandledStanza).toBe(groupChatStanza);
            expect(messagePlugin.handleStanza).toHaveBeenCalledOnceWith(unhandledStanza);
            expect((messagePlugin.handleStanza as Spy<typeof messagePlugin.handleStanza>).calls.mostRecent().returnValue).toBeFalse();
            expect(dummyPlugin.afterReceiveMessage).not.toHaveBeenCalled();

            done();
        });

        await chatConnectionService.onStanzaReceived(groupChatStanza);
    });

    it('should process archived messages but don\'t add them to new chatAdapter.message$ observable', async () => {
        const delay = '2021-08-17T15:33:25.375401Z';
        const someUserJid = parseJid('someone@example.com');
        spyOn(dummyPlugin, 'afterReceiveMessage').and.callThrough();

        const messagesObservableIsEmpty = chatAdapter.message$
            .pipe(timeoutWith(50, EMPTY), isEmpty())
            .toPromise();

        const messageStanza = xml('message', {from: someUserJid.toString(), to: chatConnectionService.userJid.toString()},
            xml('body', {}, 'message text'));

        const handled = messagePlugin.handleStanza(messageStanza, xml('delay', {stamp: delay}));

        expect(handled).toBeTrue();
        expect(await messagesObservableIsEmpty).toBeTrue();

        const contacts = chatAdapter.contacts$.getValue();
        expect(contacts.length).toBe(1);

        const someContact = contacts[0];
        expect(someContact.jidBare.equals(someUserJid)).toBeTrue();

        const messages = someContact.messages;
        expect(messages.length).toBe(1);
        expect(messages[0].body).toBe('message text');
        expect(messages[0].direction).toBe(Direction.in);
        expect(messages[0].datetime).toEqual(new Date(delay));
        expect(messages[0].delayed).toBeTrue();
        expect(messages[0].fromArchive).toBeTrue();

        expect(dummyPlugin.afterReceiveMessage).toHaveBeenCalledOnceWith(messages[0], messageStanza, jasmine.any(MessageReceivedEvent));
    });
});

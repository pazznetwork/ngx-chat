import { TestBed } from '@angular/core/testing';
import { Client } from '@xmpp/client-core';
import { jid as parseJid } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { parse } from 'ltx';
import { first } from 'rxjs/operators';
import { Direction } from '../../../../core';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { MessageCarbonsPlugin } from './message-carbons.plugin';

describe('message carbons plugin', () => {

    let xmppClientMock: jasmine.SpyObj<Client>;
    let xmppChatAdapter: XmppChatAdapter;
    let messageCarbonsPlugin: MessageCarbonsPlugin;

    beforeEach(() => {
        xmppClientMock = createXmppClientMock();

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientMock},
                XmppChatConnectionService,
                XmppChatAdapter,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        xmppChatAdapter = TestBed.get(XmppChatAdapter);
        xmppChatAdapter.chatConnectionService.userJid = parseJid('romeo@montague.example/home');
        messageCarbonsPlugin = new MessageCarbonsPlugin(xmppChatAdapter);
    });

    const validIncomingCarbonMessage = parse(`
            <message xmlns='jabber:client'
                     from='romeo@montague.example'
                     to='romeo@montague.example/home'
                     type='chat'>
              <received xmlns='urn:xmpp:carbons:2'>
                <forwarded xmlns='urn:xmpp:forward:0'>
                  <message xmlns='jabber:client'
                           from='juliet@capulet.example/balcony'
                           to='romeo@montague.example/garden'
                           type='chat'>
                    <body>What man art thou that, thus bescreen'd in night, so stumblest on my counsel?</body>
                    <thread>0e3141cd80894871a68e6fe6b1ec56fa</thread>
                  </message>
                </forwarded>
              </received>
            </message>`);

    const validSentCarbonMessage = parse(`
            <message xmlns='jabber:client'
                     from='romeo@montague.example'
                     to='romeo@montague.example/home'
                     type='chat'>
              <sent xmlns='urn:xmpp:carbons:2'>
                <forwarded xmlns='urn:xmpp:forward:0'>
                  <message xmlns='jabber:client'
                           from='romeo@montague.example/garden'
                           to='juliet@capulet.example/balcony'
                           type='chat'>
                    <body>What man art thou that, thus bescreen'd in night, so stumblest on my counsel?</body>
                    <thread>0e3141cd80894871a68e6fe6b1ec56fa</thread>
                  </message>
                </forwarded>
              </sent>
            </message>`);


    it('should accept carbon-copy message stanzas', () => {
        expect(messageCarbonsPlugin.handleStanza(validIncomingCarbonMessage)).toBeTruthy();
    });

    it('should not accept non-carbon-copy message stanzas', () => {
        const invalidMessage = xml('message');
        expect(messageCarbonsPlugin.handleStanza(invalidMessage)).toBeFalsy();
    });

    it('should add the message to the contact', () => {
        messageCarbonsPlugin.handleStanza(validIncomingCarbonMessage);
        expect(xmppChatAdapter.getContactById('juliet@capulet.example').messages.length).toEqual(1);
        const savedMessage = xmppChatAdapter.getContactById('juliet@capulet.example').messages[0];
        expect(savedMessage as any).toEqual(jasmine.objectContaining({
            body: 'What man art thou that, thus bescreen\'d in night, so stumblest on my counsel?',
            direction: Direction.in,
            datetime: jasmine.any(Date),
            delayed: false
        }));
    });

    it('should raise an event when receiving an incoming carbon copy', (done) => {
        xmppChatAdapter.message$.pipe(first()).subscribe(done);
        messageCarbonsPlugin.handleStanza(validIncomingCarbonMessage);
    });

    it('should not raise an event when receiving a sent copy', () => {
        xmppChatAdapter.message$.pipe(first()).subscribe(() => fail());
        messageCarbonsPlugin.handleStanza(validSentCarbonMessage);
    });

});

// SPDX-License-Identifier: MIT
/*
import { TestBed } from '@angular/core/testing';
import { jid as parseJid, xml } from '@xmpp/client';
import { testLogService } from '../../../../test/log-service';
import { MockClientFactory } from '../../../../test/mock-connection.service';
import { CHAT_SERVICE_TOKEN } from '../interface/chat.service';
import { ContactFactoryService } from '../service/contact-factory.service';
import { LogService } from '../service/log.service';
import { XmppChatAdapter } from '../../xmpp.service';
import {CHAT_CONNECTION_SERVICE_TOKEN, ChatConnection} from '../interface/chat-connection';
import { XmppClientFactoryService } from '../xmpp-client-factory.service';
import { PushPlugin } from './push.plugin';
import {XmppChatConnectionService} from '../service/xmpp-chat-connection.service';

describe('push plugin', () => {

    let xmppClientMock;
    let pushPlugin: PushPlugin;
    let chatConnectionService;

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        xmppClientMock = mockClientFactory.clientInstance;

        TestBed.configureTestingModule({
            providers: [
                {provide: CHAT_CONNECTION_SERVICE_TOKEN, useClass: XmppChatConnectionService},
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                {provide: CHAT_SERVICE_TOKEN, useClass: XmppChatAdapter},
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService,
            ]
        });

        // chatConnectionService = TestBed.inject(ChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        chatConnectionService.userJid = parseJid('someone@example.com');

        const chatAdapter = TestBed.inject(CHAT_SERVICE_TOKEN) as XmppChatAdapter;

        const pushService = {
            jid: 'push.jabber.example.com',
            category: 'pubsub',
            type: 'push'
        };
        const serviceDiscoveryPluginMock: any = {
            findService: () => pushService
        };
        pushPlugin = new PushPlugin(chatAdapter, serviceDiscoveryPluginMock);
    });

    it('should resolve if registration is successful', async () => {
        xmppClientMock.send.and.callFake((iqNode) => {
            if (iqNode.is('iq') && iqNode.attrs.type === 'set') {
                const enableNode = iqNode.getChild('enable', 'urn:xmpp:push:0');
                if (enableNode.attrs.jid === 'push.jabber.example.com' && enableNode.attrs.node === 'token') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: iqNode.attrs.id, type: 'result'})
                    );
                    return;
                }
            }

            throw new Error('unexpected packet');
        });
        await expectAsync(pushPlugin.register('token')).toBeResolved();
    });

    it('should throw if registration is rejected', async () => {
        xmppClientMock.send.and.callFake((iqNode) => {
            if (iqNode.is('iq') && iqNode.attrs.type === 'set') {
                const enableNode = iqNode.getChild('enable', 'urn:xmpp:push:0');
                if (enableNode.attrs.jid === 'push.jabber.example.com' && enableNode.attrs.node === 'token') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: iqNode.attrs.id, type: 'error'})
                    );
                    return;
                }
            }

            throw new Error('unexpected packet');
        });

        await expectAsync(pushPlugin.register('token')).toBeRejected();
    });

    it('should be able to unregister', async () => {
        xmppClientMock.send.and.callFake((iqNode) => {
            if (iqNode.is('iq') && iqNode.attrs.type === 'set') {
                const enableNode = iqNode.getChild('disable', 'urn:xmpp:push:0');
                if (enableNode.attrs.jid === 'push.jabber.example.com') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: iqNode.attrs.id, type: 'result'})
                    );
                    return;
                }
            }

            throw new Error('unexpected packet');
        });

        await expectAsync(pushPlugin.unregister('token')).toBeResolved();
    });

});
*/

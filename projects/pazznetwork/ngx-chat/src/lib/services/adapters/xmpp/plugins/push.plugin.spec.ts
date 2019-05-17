import { TestBed } from '@angular/core/testing';
import { jid as parseJid } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { PushPlugin } from './push.plugin';

describe('push plugin', () => {

    let xmppClientMock;
    let pushPlugin: PushPlugin;
    let chatConnectionService;

    beforeEach(() => {
        xmppClientMock = createXmppClientMock();

        const chatAdapterMock: any = {
            chatConnectionService: null // is set later
        };

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientMock},
                XmppChatConnectionService,
                {provide: XmppChatAdapter, useValue: chatAdapterMock},
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService,
            ]
        });

        chatAdapterMock.chatConnectionService = TestBed.get(XmppChatConnectionService);

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        chatConnectionService.userJid = parseJid('someone@example.com');

        const pushService = {
            jid: 'push.jabber.example.com',
            category: 'pubsub',
            type: 'push'
        };
        const serviceDiscoveryPluginMock: any = {
            findService: () => pushService
        };
        pushPlugin = new PushPlugin(chatAdapterMock, serviceDiscoveryPluginMock);
    });

    it('should resolve if registration is successful', async () => {
        xmppClientMock.send.and.callFake((iqNode) => {
            if (iqNode.is('iq') && iqNode.attrs.type === 'set') {
                const enableNode = iqNode.getChild('enable', 'urn:xmpp:push:0');
                if (enableNode.attrs.jid === 'push.jabber.example.com' && enableNode.attrs.node === 'token') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: iqNode.attrs.id, type: 'result'})
                    );
                }
            }

            throw new Error('unexpected packet');
        });
        await pushPlugin.register('token');
    });

    it('should throw if registration is rejected', async () => {
        xmppClientMock.send.and.callFake((iqNode) => {
            if (iqNode.is('iq') && iqNode.attrs.type === 'set') {
                const enableNode = iqNode.getChild('enable', 'urn:xmpp:push:0');
                if (enableNode.attrs.jid === 'push.jabber.example.com' && enableNode.attrs.node === 'token') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: iqNode.attrs.id, type: 'error'})
                    );
                }
            }

            throw new Error('unexpected packet');
        });

        try {
            await pushPlugin.register('token');
            fail('should have thrown');
        } catch (e) {
            // pass
        }

    });

    it('should be able to unregister', async () => {
        xmppClientMock.send.and.callFake((iqNode) => {
            if (iqNode.is('iq') && iqNode.attrs.type === 'set') {
                const enableNode = iqNode.getChild('disable', 'urn:xmpp:push:0');
                if (enableNode.attrs.jid === 'push.jabber.example.com') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: iqNode.attrs.id, type: 'result'})
                    );
                }
            }

            throw new Error('unexpected packet');
        });

        await pushPlugin.unregister('token');
    });

});

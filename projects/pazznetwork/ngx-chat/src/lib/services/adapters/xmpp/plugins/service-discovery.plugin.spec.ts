import { TestBed } from '@angular/core/testing';
import { JID } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { Stanza } from '../../../../core';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

describe('service discovery plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let xmppClientMock;

    beforeEach(() => {
        xmppClientMock = createXmppClientMock();
        Object.assign(xmppClientMock, {startOptions: {domain: 'jabber.example.com'}});

        TestBed.configureTestingModule({
            providers: [
                {provide: XmppClientToken, useValue: xmppClientMock},
                XmppChatConnectionService,
                XmppChatAdapter,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.get(XmppChatConnectionService);
        chatAdapter = TestBed.get(XmppChatAdapter);
        chatAdapter.addPlugins([new ServiceDiscoveryPlugin(chatAdapter)]);

        chatConnectionService.userJid = new JID('me', 'jabber.example.com', 'something');
    });

    it('should discover the multi user chat service', async () => {
        // given
        xmppClientMock.send.and.callFake((content) => {
            if (content.attrs.to === 'jabber.example.com'
                && content.getChild('query').attrs.xmlns === 'http://jabber.org/protocol/disco#items') {

                chatConnectionService.onStanzaReceived(
                    xml('iq', {type: 'result', id: content.attrs.id},
                        xml('query', {xmlns: 'http://jabber.org/protocol/disco#items'},
                            xml('item', {jid: 'conference.jabber.example.com'})
                        )
                    ) as Stanza
                );
            } else if (content.getChild('query') && content.getChild('query').attrs.xmlns === 'http://jabber.org/protocol/disco#info') {
                if (content.attrs.to === 'conference.jabber.example.com') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {type: 'result', id: content.attrs.id, from: content.attrs.to},
                            xml('query', {xmlns: 'http://jabber.org/protocol/disco#info'},
                                xml('identity', {type: 'text', category: 'conference'})
                            )
                        ) as Stanza
                    );
                } else {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {type: 'result', id: content.attrs.id, from: content.attrs.to},
                            xml('query', {xmlns: 'http://jabber.org/protocol/disco#info'},
                                xml('identity', {type: 'type', category: 'category'})
                            )
                        ) as Stanza
                    );
                }
            } else {
                fail('unexpected stanza: ' + content.toString());
            }
        });

        // when
        const serviceDiscoveryPlugin = chatAdapter.getPlugin(ServiceDiscoveryPlugin);
        await serviceDiscoveryPlugin.onBeforeOnline();
        const service = await serviceDiscoveryPlugin.findService('conference', 'text');

        // then
        expect(service.jid).toEqual('conference.jabber.example.com');
    });

});

import { TestBed } from '@angular/core/testing';
import { Client, jid as parseJid, xml } from '@xmpp/client';
import { Stanza } from '../../../../core';
import { testLogService } from '../../../../test/log-service';
import { MockClientFactory } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService } from '../xmpp-chat-connection.service';
import { XmppClientFactoryService } from '../xmpp-client-factory.service';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

describe('service discovery plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let xmppClientMock: jasmine.SpyObj<Client>;

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        xmppClientMock = mockClientFactory.clientInstance;

        TestBed.configureTestingModule({
            providers: [
                XmppChatAdapter,
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService
            ]
        });

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        chatConnectionService.userJid = parseJid('me', 'jabber.example.com', 'something');

        chatAdapter = TestBed.inject(XmppChatAdapter);
        chatAdapter.addPlugins([new ServiceDiscoveryPlugin(chatAdapter)]);
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
            return Promise.resolve();
        });

        // when
        const serviceDiscoveryPlugin = chatAdapter.getPlugin(ServiceDiscoveryPlugin);
        await serviceDiscoveryPlugin.onBeforeOnline();
        const service = await serviceDiscoveryPlugin.findService('conference', 'text');

        // then
        expect(service.jid).toEqual('conference.jabber.example.com');
    });

});

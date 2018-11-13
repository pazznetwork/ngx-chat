import { TestBed } from '@angular/core/testing';
import { JID, jid as parseJid } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { first } from 'rxjs/operators';
import { Direction, Stanza } from '../../../../core';
import { testLogService } from '../../../../test/logService';
import { createXmppClientMock } from '../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from '../xmpp-chat-connection.service';
import { MessageUuidPlugin } from './message-uuid.plugin';
import { MultiUserChatPlugin } from './multi-user-chat.plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

const defaultRoomConfiguration = {
    roomId: 'roomId',
    public: false,
    membersOnly: true,
    nonAnonymous: true,
    persistentRoom: false
};

describe('multi user chat plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let xmppClientMock: any;
    let multiUserChatPlugin: MultiUserChatPlugin;
    let logService: LogService;

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

        logService = TestBed.get(LogService);
        chatConnectionService = TestBed.get(XmppChatConnectionService);
        chatConnectionService.userJid = new JID('me', 'example.com', 'something');

        chatAdapter = TestBed.get(XmppChatAdapter);

        const serviceDiscoveryPlugin = new ServiceDiscoveryPlugin(chatAdapter);
        spyOn(serviceDiscoveryPlugin, 'findService').and.returnValue({
                jid: 'conference.jabber.example.com'
            }
        );

        chatAdapter.addPlugins([new MultiUserChatPlugin(chatAdapter, logService), serviceDiscoveryPlugin, new MessageUuidPlugin()]);

        multiUserChatPlugin = chatAdapter.getPlugin(MultiUserChatPlugin);
    });

    describe('room creation', () => {

        it('should throw if user is not allowed to create rooms', async () => {

            xmppClientMock.send.and.callFake((content: Stanza) => {
                chatConnectionService.onStanzaReceived(
                    xml('presence', {from: content.attrs.to, to: content.attrs.from},
                        xml('x', {xmlns: 'http://jabber.org/protocol/muc#user', type: 'error'}),
                        xml('error', {by: 'me@example.com', type: 'cancel'},
                            xml('not-allowed', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'})
                        )
                    )
                );
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should have thrown');
            } catch (e) {
                expect(e.message).toContain('error joining room: ');
            }

        });

        it('should throw if user is not owner', async () => {

            xmppClientMock.send.and.callFake((content: Stanza) => {
                chatConnectionService.onStanzaReceived(
                    xml('presence', {from: content.attrs.to, to: content.attrs.from},
                        xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'},
                            xml('item', {affiliation: 'visitor', role: 'visitor'})
                        )
                    )
                );
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should have thrown');
            } catch (e) {
                expect(e.message).toContain('error creating room, user is not owner');
            }

        });

        it('should throw if room is not configurable', async () => {

            xmppClientMock.send.and.callFake((content: Stanza) => {

                if (content.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: content.attrs.to, to: content.attrs.from},
                            xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'})
                            )
                        )
                    );
                } else if (content.name === 'iq') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: content.attrs.to, to: content.attrs.from, type: 'result', id: content.attrs.id},
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'})
                        )
                    );
                } else {
                    fail('unexpected stanza: ' + content.toString());
                }

            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should have thrown');
            } catch (e) {
                expect(e.message).toContain('room not configurable');
            }

        });

        it('should handle room configurations correctly', async () => {
            xmppClientMock.send.and.callFake((content: Stanza) => {
                if (content.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: content.attrs.to, to: content.attrs.from},
                            xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'})
                            )
                        )
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'get') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: content.attrs.to, to: content.attrs.from, type: 'result', id: content.attrs.id},
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                                xml('x', {type: 'form', xmlns: 'jabber:x:data'},
                                    xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                                        xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
                                    )
                                )
                            )
                        )
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'set') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: content.attrs.to, to: content.attrs.from, type: 'error', id: content.attrs.id},
                            xml('error', {type: 'modify'},
                                xml('not-acceptable', {xmlns: 'urn:ietf:params:ml:ns:xmpp-stanzas'})
                            )
                        )
                    );
                } else {
                    fail('unexpected stanza: ' + content.toString());
                }
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should be rejected');
            } catch (e) {
                expect(e.message).toContain('room configuration rejected');
            }

        });


        it('should allow users to create and configure rooms', async () => {

            xmppClientMock.send.and.callFake((content: Stanza) => {
                if (content.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: content.attrs.to, to: content.attrs.from},
                            xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'})
                            )
                        )
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'get') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: content.attrs.to, to: content.attrs.from, type: 'result', id: content.attrs.id},
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                                xml('x', {type: 'form', xmlns: 'jabber:x:data'},
                                    xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                                        xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
                                    ),
                                    xml('field', {var: 'multipleValues', type: 'list-multi'},
                                        xml('value', {}, 'value1'),
                                        xml('value', {}, 'value2')
                                    )
                                )
                            )
                        )
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'set') {
                    const configurationList = content.getChild('query').getChild('x');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_publicroom', '0');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_whois', 'anyone');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_membersonly', '1');
                    expectConfigurationOption(configurationList, 'multipleValues', ['value1', 'value2']);
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: content.attrs.to, to: content.attrs.from, type: 'result', id: content.attrs.id})
                    );
                } else {
                    fail('unexpected stanza: ' + content.toString());
                }
            });

            await multiUserChatPlugin.createRoom(defaultRoomConfiguration);

        });
    });

    describe('room message handling', () => {

        it('should be able to receive messages in rooms', async (resolve) => {

            xmppClientMock.send.and.callFake((content: Stanza) => {
                chatConnectionService.onStanzaReceived(
                    xml('presence', {from: content.attrs.to, to: content.attrs.from},
                        xml('x', {xmlns: 'http://jabber.org/protocol/muc#user', type: 'error'},
                            xml('item', {affiliation: 'member', role: 'participant'}),
                            xml('status', {code: '110'}),
                            xml('status', {code: '210'})
                        ),
                    )
                );
            });

            await multiUserChatPlugin.joinRoom(new JID('chatroom', 'conference.example.com'));

            const rooms = multiUserChatPlugin.rooms$.getValue();
            expect(rooms.length).toEqual(1);

            rooms[0].message$
                .pipe(first())
                .subscribe((message) => {
                    expect(message.body).toEqual('message content here');
                    resolve();
                });

            const otherOccupant = 'chatroom@conference.example.com/other-occupant';
            chatConnectionService.onStanzaReceived(
                xml('message', {from: otherOccupant, id: '1', to: chatConnectionService.userJid.toString(), type: 'groupchat'},
                    xml('body', {}, 'message content here')
                )
            );

        });

        it('should be able to send messages', async () => {

            xmppClientMock.send.and.callFake((stanza: Stanza) => {

                if (stanza.name === 'message') {
                    expect(stanza.name).toEqual('message');
                    expect(stanza.attrs.from).toEqual('me@example.com/something');
                    expect(stanza.attrs.to).toEqual('chatroom@conference.example.com');
                    expect(stanza.attrs.type).toEqual('groupchat');
                    expect(stanza.getChildText('body')).toEqual('message body');

                    chatConnectionService.onStanzaReceived(
                        xml('message', {from: 'chatroom@conference.example.com/me', to: 'me@example.com/something', type: 'groupchat'},
                            xml('body', {}, 'message body'),
                            xml('origin-id', {id: stanza.getChild('origin-id').attrs.id})
                        )
                    );
                } else if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from},
                            xml('x', {xmlns: 'http://jabber.org/protocol/muc#user'},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'})
                            )
                        )
                    );
                } else {
                    throw new Error('unknown stanza: ' + stanza.toString());
                }

            });

            // when
            const myOccupantJid = parseJid('chatroom@conference.example.com/me');
            const room = await multiUserChatPlugin.joinRoom(myOccupantJid);
            await multiUserChatPlugin.sendMessage(room, 'message body');

            // then
            expect(room.messages.length).toEqual(1);
            expect(room.messages[0].body).toEqual('message body');
            expect(room.messages[0].direction).toEqual(Direction.out);
            expect(room.messages[0].id).not.toBeUndefined();
            expect(room.messages[0].from).toEqual(myOccupantJid);

        });

    });

});

function expectConfigurationOption(configurationList: Stanza, configurationKey: string, expected: any) {
    const value = extractConfigurationValue(configurationList, configurationKey);
    expect(value).toEqual(expected);
}

function extractConfigurationValue(configurationList: Stanza, configurationKey: string) {
    const fieldNodes = configurationList.getChildrenByAttr('var', configurationKey);
    expect(fieldNodes.length).toEqual(1);
    const fieldNode = fieldNodes[0];
    const values = fieldNode.getChildren('value').map(node => node.getText());
    return values.length === 1 ? values[0] : values;
}

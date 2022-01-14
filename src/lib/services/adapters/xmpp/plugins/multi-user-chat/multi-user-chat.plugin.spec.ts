import { TestBed } from '@angular/core/testing';
import { jid as parseJid, xml } from '@xmpp/client';
import { filter, first } from 'rxjs/operators';
import { Direction } from '../../../../../core/message';
import { Stanza } from '../../../../../core/stanza';
import { testLogService } from '../../../../../test/log-service';
import { MockClientFactory } from '../../../../../test/xmppClientMock';
import { ContactFactoryService } from '../../../../contact-factory.service';
import { LogService } from '../../../../log.service';
import { XmppResponseError } from '../../xmpp-response.error';
import { XmppChatAdapter } from '../../xmpp-chat-adapter.service';
import { XmppChatConnectionService } from '../../xmpp-chat-connection.service';
import { XmppClientFactoryService } from '../../xmpp-client-factory.service';
import { MessageUuidPlugin } from '../message-uuid.plugin';
import { MultiUserChatPlugin } from './multi-user-chat.plugin';
import { jid } from '@xmpp/jid';
import { Affiliation } from './affiliation';
import { Role } from './role';
import { OccupantNickChange } from './occupant-change';

const defaultRoomConfiguration = {
    roomId: 'roomId',
    public: false,
    membersOnly: true,
    nonAnonymous: true,
    persistentRoom: false,
};

describe('multi user chat plugin', () => {

    let chatConnectionService: XmppChatConnectionService;
    let chatAdapter: XmppChatAdapter;
    let xmppClientMock: any;
    let multiUserChatPlugin: MultiUserChatPlugin;
    let logService: LogService;

    const joinedPresenceStanza = (stanza: Stanza) => xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from},
        xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
            xml('item', {affiliation: 'owner', role: 'moderator'}),
            xml('status', {code: '110'}),
        ),
    );

    beforeEach(() => {
        const mockClientFactory = new MockClientFactory();
        xmppClientMock = mockClientFactory.clientInstance;

        TestBed.configureTestingModule({
            providers: [
                XmppChatConnectionService,
                {provide: XmppClientFactoryService, useValue: mockClientFactory},
                XmppChatAdapter,
                {provide: LogService, useValue: testLogService()},
                ContactFactoryService,
            ],
        });

        chatConnectionService = TestBed.inject(XmppChatConnectionService);
        chatConnectionService.client = xmppClientMock;
        chatConnectionService.userJid = parseJid('me', 'example.com', 'something');

        chatAdapter = TestBed.inject(XmppChatAdapter);

        const conferenceService = {
            jid: 'conference.jabber.example.com',
        };
        const serviceDiscoveryPluginMock: any = {
            findService: () => conferenceService,
        };

        logService = TestBed.inject(LogService);
        chatAdapter.addPlugins([
            new MultiUserChatPlugin(chatAdapter, logService, serviceDiscoveryPluginMock),
            new MessageUuidPlugin(),
        ]);

        multiUserChatPlugin = chatAdapter.getPlugin(MultiUserChatPlugin);
    });

    describe('room creation', () => {

        it('should throw if user is not allowed to create rooms', async () => {

            xmppClientMock.send.and.callFake((content: Stanza) => {
                chatConnectionService.onStanzaReceived(
                    xml('presence', {from: content.attrs.to, to: content.attrs.from},
                        xml('x', {xmlns: MultiUserChatPlugin.MUC_USER, type: 'error'}),
                        xml('error', {by: 'me@example.com', type: 'cancel'},
                            xml('not-allowed', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}),
                        ),
                    ),
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
                        xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                            xml('item', {affiliation: 'visitor', role: 'visitor'}),
                        ),
                    ),
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
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'}),
                            ),
                        ),
                    );
                } else if (content.name === 'iq') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                                from: content.attrs.to,
                                to: content.attrs.from,
                                type: 'result',
                                id: content.attrs.id,
                            },
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'}),
                        ),
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
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'}),
                            ),
                        ),
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'get') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                                from: content.attrs.to,
                                to: content.attrs.from,
                                type: 'result',
                                id: content.attrs.id,
                            },
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                                xml('x', {type: 'form', xmlns: 'jabber:x:data'},
                                    xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                                        xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig'),
                                    ),
                                ),
                            ),
                        ),
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'set') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: content.attrs.to, to: content.attrs.from, type: 'error', id: content.attrs.id},
                            xml('error', {type: 'modify'},
                                xml('not-acceptable', {xmlns: XmppResponseError.ERROR_ELEMENT_NS}),
                            ),
                        ),
                    );
                } else {
                    fail('unexpected stanza: ' + content.toString());
                }
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should be rejected');
            } catch (e: unknown) {
                expect(e instanceof XmppResponseError).toBeTrue();
                expect((e as XmppResponseError).errorType).toBe('modify');
                expect((e as XmppResponseError).errorCondition).toBe('not-acceptable');
            }
        });


        it('should allow users to create and configure rooms', async () => {

            xmppClientMock.send.and.callFake((content: Stanza) => {
                if (content.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: content.attrs.to, to: content.attrs.from},
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'}),
                            ),
                        ),
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'get') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                                from: content.attrs.to,
                                to: content.attrs.from,
                                type: 'result',
                                id: content.attrs.id,
                            },
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                                xml('x', {type: 'form', xmlns: 'jabber:x:data'},
                                    xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                                        xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig'),
                                    ),
                                    xml('field', {var: 'multipleValues', type: 'list-multi'},
                                        xml('value', {}, 'value1'),
                                        xml('value', {}, 'value2'),
                                    ),
                                ),
                            ),
                        ),
                    );
                } else if (content.name === 'iq' && content.attrs.type === 'set') {
                    const configurationList = content.getChild('query').getChild('x');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_publicroom', '0');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_whois', 'anyone');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_membersonly', '1');
                    expectConfigurationOption(configurationList, 'multipleValues', ['value1', 'value2']);
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                            from: content.attrs.to,
                            to: content.attrs.from,
                            type: 'result',
                            id: content.attrs.id,
                        }),
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
                        xml('x', {xmlns: MultiUserChatPlugin.MUC_USER, type: 'error'},
                            xml('item', {affiliation: 'member', role: 'participant'}),
                            xml('status', {code: '110'}),
                            xml('status', {code: '210'}),
                        ),
                    ),
                );
            });

            await multiUserChatPlugin.joinRoom(parseJid('chatroom', 'conference.example.com'));

            const rooms = multiUserChatPlugin.rooms$.getValue();
            expect(rooms.length).toEqual(1);

            rooms[0].messages$
                .pipe(first())
                .subscribe((message) => {
                    expect(message.body).toEqual('message content here');
                    resolve();
                });

            const otherOccupant = 'chatroom@conference.example.com/other-occupant';
            chatConnectionService.onStanzaReceived(
                xml('message', {
                        from: otherOccupant,
                        id: '1',
                        to: chatConnectionService.userJid.toString(),
                        type: 'groupchat',
                    },
                    xml('body', {}, 'message content here'),
                ),
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
                        xml('message', {
                                from: 'chatroom@conference.example.com/me',
                                to: 'me@example.com/something',
                                type: 'groupchat',
                            },
                            xml('body', {}, 'message body'),
                            xml('origin-id', {id: stanza.getChild('origin-id').attrs.id}),
                        ),
                    );
                } else if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from},
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'}),
                            ),
                        ),
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

    describe('room operations handling', () => {

        it('should handle kicked occupant and leave room', async (resolve) => {
            const otherOccupantJid = parseJid('chatroom@conference.example.com/other');

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.attrs.type) {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {
                                from: stanza.attrs.to + '/' + otherOccupantJid.resource,
                                to: stanza.attrs.from,
                                type: 'unavailable',
                            },
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {affiliation: 'none', role: 'none'}),
                                xml('status', {code: '307'}),
                                xml('status', {code: '110'}),
                            ),
                        ),
                    );
                } else {
                    chatConnectionService.onStanzaReceived(joinedPresenceStanza(stanza));
                }
            });

            const room = await multiUserChatPlugin.joinRoom(otherOccupantJid);

            expect(multiUserChatPlugin.rooms$.getValue().length).toEqual(1);

            room.onOccupantChange$.pipe(
                filter(({change}) => change === 'kicked'),
            ).subscribe(({occupant}) => {
                expect(occupant.nick).toEqual(otherOccupantJid.resource);
                expect(occupant.role).toEqual(Role.none);
                expect(occupant.affiliation).toEqual(Affiliation.none);
                expect(multiUserChatPlugin.rooms$.getValue().length).toEqual(0);
                resolve();
            });
            await multiUserChatPlugin.kickOccupant(otherOccupantJid.resource, room.roomJid);
        });

        it('should handle banned occupant', async (resolve) => {
            const otherOccupantJid = parseJid('chatroom@conference.example.com/other');

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.attrs.type) {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {
                                from: stanza.attrs.to + '/' + otherOccupantJid.resource,
                                to: stanza.attrs.from,
                                type: 'unavailable',
                            },
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {
                                    affiliation: 'outcast',
                                    role: Role.none,
                                    jid: otherOccupantJid.toString(),
                                }),
                                xml('status', {code: '301'}),
                            ),
                        ),
                    );
                } else {
                    chatConnectionService.onStanzaReceived(joinedPresenceStanza(stanza));
                }
            });

            const room = await multiUserChatPlugin.joinRoom(otherOccupantJid);

            room.onOccupantChange$.pipe(
                filter(({change}) => change === 'banned'),
            ).subscribe(({occupant}) => {
                expect(occupant.nick).toEqual(otherOccupantJid.resource);
                expect(occupant.role).toEqual(Role.none);
                expect(occupant.affiliation).toEqual(Affiliation.outcast);
                resolve();
            });
            await multiUserChatPlugin.banUser(otherOccupantJid, jid('chatroom@conference.example.com'));
        });

        it('should handle unban occupant', async () => {
            const otherOccupantJid = 'chatroom@conference.example.com/other';
            const roomJid = 'chatroom@conference.example.com';
            let bannedOccupantItem = xml('item', {affiliation: 'outcast', jid: otherOccupantJid});

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {
                                from: stanza.attrs.to + '/other',
                                to: stanza.attrs.from,
                                type: 'unavailable',
                            },
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {
                                    affiliation: 'outcast',
                                    role: Role.none,
                                    jid: otherOccupantJid.toString(),
                                }),
                                xml('status', {code: '301'}),
                            ),
                        ),
                    );
                } else if (stanza.name === 'iq') {
                    if (stanza.attrs.type === 'get') { // get ban list
                        chatConnectionService.onStanzaReceived(
                            xml('iq', {
                                    from: stanza.attrs.to,
                                    to: stanza.attrs.from,
                                    type: 'result',
                                    id: stanza.attrs.id,
                                },
                                xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
                                    bannedOccupantItem,
                                ),
                            ),
                        );
                    } else if (stanza.attrs.type === 'set') { // unban
                        chatConnectionService.onStanzaReceived(
                            xml('iq', {
                                    from: stanza.attrs.to,
                                    to: stanza.attrs.from,
                                    type: 'result',
                                    id: stanza.attrs.id,
                                },
                                xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
                                    xml('item', {affiliation: 'none', jid: otherOccupantJid}),
                                ),
                            ),
                        );
                    }
                }
            });

            await multiUserChatPlugin.banUser(jid(otherOccupantJid), jid(roomJid));
            let banList = await multiUserChatPlugin.getBanList(jid(roomJid));
            expect(banList.length).toEqual(1);
            await multiUserChatPlugin.unbanUser(jid(otherOccupantJid), jid(roomJid));
            bannedOccupantItem = null;
            banList = await multiUserChatPlugin.getBanList(jid(roomJid));
            expect(banList.length).toEqual(0);
        });

        it('should be able to invite user', () => {
            // todo
        });

        it('should be able to change nick', async (resolve) => {
            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.getChild('x', MultiUserChatPlugin.MUC)) {
                    chatConnectionService.onStanzaReceived(joinedPresenceStanza(stanza));
                } else {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: myOccupantJid.toString(), to: stanza.attrs.from, type: 'unavailable'},
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                                xml('item', {
                                    nick: 'newNick',
                                    jid: myOccupantJid.toString(),
                                }),
                                xml('status', {code: '303'}),
                                xml('status', {code: '110'}),
                            ),
                        ),
                    );
                }
            });

            const myOccupantJid = parseJid('chatroom@conference.example.com/something');
            const room = await multiUserChatPlugin.joinRoom(myOccupantJid);

            room.onOccupantChange$.pipe(
                filter(({change}) => change === 'changedNick'),
            ).subscribe(({occupant, newNick}: OccupantNickChange) => {
                expect(newNick).toEqual('newNick');
                expect(occupant.occupantJid.toString()).toEqual(myOccupantJid.toString());
                resolve();
            });

            await multiUserChatPlugin.changeUserNickname('newNick', room.roomJid);
        });

        it('should be able to change room topic', async () => {
            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from},
                            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER, type: 'error'},
                                xml('item', {affiliation: 'member', role: 'participant'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '210'}),
                            ),
                        ),
                    );
                } else if (stanza.name === 'message') {
                    chatConnectionService.onStanzaReceived(
                        xml('message', {
                                from: stanza.attrs.to,
                                to: stanza.attrs.from,
                                id: stanza.attrs.id,
                                type: 'groupchat',
                            },
                            xml('subject', {}, stanza.getChildText('subject')),
                        ),
                    );
                }
            });

            const roomJid = parseJid('chatroom', 'conference.example.com');
            const room = await multiUserChatPlugin.joinRoom(roomJid);

            expect(room.name).toBeTruthy();
            const newSubject = 'new subject';

            await multiUserChatPlugin.changeRoomSubject(room.roomJid, newSubject);
            expect(multiUserChatPlugin.rooms$.getValue()[0].name).toEqual(newSubject);
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

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
import { Invitation } from './invitation';
import { mucAdminNs, mucNs, mucRoomConfigFormNs, mucUserNs } from './multi-user-chat-constants';
import { ServiceDiscoveryPlugin } from '../service-discovery.plugin';

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
            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'iq' && stanza.attrs.type === 'get' && stanza.getChild('query', ServiceDiscoveryPlugin.DISCO_INFO)) {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {id: stanza.attrs.id, from: stanza.attrs.to, to: stanza.attrs.from, type: 'error'},
                            xml('error', {by: 'me@example.com', type: 'cancel'},
                                xml('item-not-found', {xmlns: XmppResponseError.ERROR_ELEMENT_NS}),
                            ),
                        ) as Stanza,
                    );
                } else if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {id: stanza.attrs.id, from: stanza.attrs.to, to: stanza.attrs.from, type: 'error'},
                            xml('x', {xmlns: mucUserNs, type: 'error'}),
                            xml('error', {by: 'me@example.com', type: 'cancel'},
                                xml('not-allowed', {xmlns: XmppResponseError.ERROR_ELEMENT_NS}),
                                xml('text', {xmlns: XmppResponseError.ERROR_ELEMENT_NS}, `Not allowed for user ${stanza.attrs.from}!`),
                            ),
                        ) as Stanza,
                    );
                } else {
                    throw new Error(`Unexpected stanza: ${stanza.toString()}`);
                }
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should have thrown');
            } catch (e) {
                expect(e.message).toContain('Not allowed for user');
            }

        });

        it('should throw if user is not owner', async () => {

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'iq' && stanza.getChild('query')) {
                    chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                } else {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from, id: stanza.attrs.id},
                            xml('x', {xmlns: mucUserNs},
                                xml('item', {affiliation: Affiliation.none, role: Role.visitor}),
                            ),
                        ) as Stanza,
                    );
                }
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should have thrown');
            } catch (e) {
                expect(e.message).toContain('error creating room, user is not owner');
            }

        });

        it('should throw if room is not configurable', async () => {

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from, id: stanza.attrs.id},
                            xml('x', {xmlns: mucUserNs},
                                xml('item', {affiliation: 'owner', role: 'moderator'}),
                                xml('status', {code: '110'}),
                                xml('status', {code: '201'}),
                            ),
                        ) as Stanza,
                    );
                } else if (stanza.name === 'iq') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                                from: stanza.attrs.to,
                                to: stanza.attrs.from,
                                type: 'result',
                                id: stanza.attrs.id,
                            },
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'}),
                        ) as Stanza,
                    );
                } else {
                    fail('unexpected stanza: ' + stanza.toString());
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
            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
                } else if (stanza.name === 'iq' && stanza.attrs.type === 'get') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                                from: stanza.attrs.to,
                                to: stanza.attrs.from,
                                type: 'result',
                                id: stanza.attrs.id,
                            },
                            xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                                xml('x', {type: 'form', xmlns: 'jabber:x:data'},
                                    xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                                        xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig'),
                                    ),
                                ),
                            ),
                        ) as Stanza,
                    );
                } else if (stanza.name === 'iq' && stanza.attrs.type === 'set') {
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {from: stanza.attrs.to, to: stanza.attrs.from, type: 'error', id: stanza.attrs.id},
                            xml('error', {type: 'modify'},
                                xml('not-acceptable', {xmlns: XmppResponseError.ERROR_ELEMENT_NS}),
                            ),
                        ) as Stanza,
                    );
                } else {
                    fail('unexpected stanza: ' + stanza.toString());
                }
            });

            try {
                await multiUserChatPlugin.createRoom(defaultRoomConfiguration);
                fail('should be rejected');
            } catch (e) {
                expect(e.message).toContain('field for variable not found!');
            }
        });


        it('should allow users to create and configure rooms', async () => {

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
                } else if (stanza.name === 'iq' && stanza.attrs.type === 'get') {
                    chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                } else if (stanza.name === 'iq' && stanza.attrs.type === 'set') {
                    const configurationList = stanza.getChild('query').getChild('x') as Stanza;
                    expectConfigurationOption(configurationList, 'muc#roomconfig_publicroom', 'false');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_whois', 'anyone');
                    expectConfigurationOption(configurationList, 'muc#roomconfig_membersonly', 'true');
                    expectConfigurationOption(configurationList, 'multipleValues', ['value1', 'value2']);
                    chatConnectionService.onStanzaReceived(
                        xml('iq', {
                            from: stanza.attrs.to,
                            to: stanza.attrs.from,
                            type: 'result',
                            id: stanza.attrs.id,
                        }) as Stanza,
                    );
                } else {
                    fail('unexpected stanza: ' + stanza.toString());
                }
            });

            await multiUserChatPlugin.createRoom(defaultRoomConfiguration);

        });
    });

    describe('room message handling', () => {

        it('should be able to receive messages in rooms', async (resolve) => {

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.name === 'iq') {
                    chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                } else {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
                }
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
                ) as Stanza,
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
                        ) as Stanza,
                    );
                } else if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
                } else if (stanza.name === 'iq') {
                    chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
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
                if (stanza.name === 'iq') {
                    if (stanza.attrs.type === 'get') {
                        chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                    } else if (stanza.attrs.type === 'set') {
                        chatConnectionService.onStanzaReceived(
                            xml('presence', {
                                    from: stanza.attrs.to + '/' + otherOccupantJid.resource,
                                    to: stanza.attrs.from,
                                    type: 'unavailable',
                                },
                                xml('x', {xmlns: mucUserNs},
                                    xml('item', {affiliation: 'none', role: 'none'}),
                                    xml('status', {code: '307'}),
                                    xml('status', {code: '110'}),
                                ),
                            ) as Stanza,
                        );
                    }
                } else {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
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
                if (stanza.name === 'iq') {
                    if (stanza.attrs.type === 'get' && stanza.getChild('query', 'http://jabber.org/protocol/disco#info')) {
                        chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                    } else if (stanza.attrs.type === 'get') {
                        const affiliation = stanza.getChild('query')?.getChild('item')?.attrs.affiliation;
                        if (affiliation && affiliation === Affiliation.member) {
                            chatConnectionService.onStanzaReceived(
                                xml('iq', {
                                        to: stanza.attrs.from,
                                        from: stanza.attrs.to,
                                        id: stanza.attrs.id,
                                        type: 'result',
                                    },
                                    xml('query', {xmlns: mucAdminNs},
                                        xml('item', {
                                            affiliation: Affiliation.member,
                                            role: Role.participant,
                                            jid: otherOccupantJid.bare().toString(),
                                            nick: otherOccupantJid.resource,
                                        }),
                                    ),
                                ) as Stanza,
                            );
                        } else {
                            chatConnectionService.onStanzaReceived(
                                xml('iq', {
                                        to: stanza.attrs.from,
                                        from: stanza.attrs.to,
                                        id: stanza.attrs.id,
                                        type: 'result',
                                    },
                                    xml('query', {xmlns: mucAdminNs}),
                                ) as Stanza,
                            );
                        }
                    } else if (stanza.attrs.type === 'set') {
                        chatConnectionService.onStanzaReceived(
                            xml('presence', {
                                    from: stanza.attrs.to + '/' + otherOccupantJid.resource,
                                    to: stanza.attrs.from,
                                    type: 'unavailable',
                                },
                                xml('x', {xmlns: mucUserNs},
                                    xml('item', {
                                        affiliation: 'outcast',
                                        role: Role.none,
                                        jid: otherOccupantJid.toString(),
                                    }),
                                    xml('status', {code: '301'}),
                                ),
                            ) as Stanza,
                        );
                    }
                } else if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
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
                            xml('x', {xmlns: mucUserNs},
                                xml('item', {
                                    affiliation: 'outcast',
                                    role: Role.none,
                                    jid: otherOccupantJid.toString(),
                                }),
                                xml('status', {code: '301'}),
                            ),
                        ) as Stanza,
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
                                xml('query', {xmlns: mucAdminNs},
                                    bannedOccupantItem,
                                ),
                            ) as Stanza,
                        );
                    } else if (stanza.attrs.type === 'set') { // unban
                        chatConnectionService.onStanzaReceived(
                            xml('iq', {
                                    from: stanza.attrs.to,
                                    to: stanza.attrs.from,
                                    type: 'result',
                                    id: stanza.attrs.id,
                                },
                                xml('query', {xmlns: mucAdminNs},
                                    xml('item', {affiliation: 'none', jid: otherOccupantJid}),
                                ),
                            ) as Stanza,
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

        it('should be able to invite user', async (resolve) => {
            const myOccupantJid = parseJid('me@example.com/something');
            const otherOccupantJid = parseJid('other@example.com/something');
            const roomJid = parseJid('chatroom@conference.example.com');

            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                const inviteEl = stanza.getChild('x', mucUserNs).getChild('invite');
                expect(stanza.attrs.to).toEqual(roomJid.toString());
                expect(stanza.attrs.from).toEqual(myOccupantJid.toString());
                expect(inviteEl.attrs.to).toEqual(otherOccupantJid.toString());

                chatConnectionService.onStanzaReceived(
                    xml('message', {from: stanza.attrs.to, to: inviteEl.attrs.to, id: stanza.attrs.id},
                        xml('x', {xmlns: mucUserNs},
                            xml('invite', {from: stanza.attrs.from},
                                xml('reason', {}, 'reason')),
                        ),
                    ) as Stanza,
                );
            });

            multiUserChatPlugin.onInvitation$.subscribe((invitation: Invitation) => {
                expect(invitation.type).toEqual('invite');
                expect(invitation.roomJid).toEqual(roomJid);
                expect(invitation.from).toEqual(myOccupantJid);
                expect(invitation.message).toEqual('reason');
                resolve();
            });
            await multiUserChatPlugin.inviteUser(otherOccupantJid, roomJid);
        });

        it('should be able to change nick', async (resolve) => {
            xmppClientMock.send.and.callFake((stanza: Stanza) => {
                if (stanza.getChild('x', mucNs)) {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
                } else if (stanza.name === 'iq') {
                    chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                } else {
                    chatConnectionService.onStanzaReceived(
                        xml('presence', {from: myOccupantJid.toString(), to: stanza.attrs.from, type: 'unavailable'},
                            xml('x', {xmlns: mucUserNs},
                                xml('item', {
                                    nick: 'newNick',
                                    jid: myOccupantJid.toString(),
                                }),
                                xml('status', {code: '303'}),
                                xml('status', {code: '110'}),
                            ),
                        ) as Stanza,
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
                if (stanza.name === 'iq') {
                    chatConnectionService.onStanzaReceived(mockRoomInfoStanza(stanza) as Stanza);
                } else if (stanza.name === 'presence') {
                    chatConnectionService.onStanzaReceived(mockJoinPresenceStanza(stanza) as Stanza);
                } else if (stanza.name === 'message') {
                    chatConnectionService.onStanzaReceived(
                        xml('message', {
                                from: stanza.attrs.to,
                                to: stanza.attrs.from,
                                id: stanza.attrs.id,
                                type: 'groupchat',
                            },
                            xml('subject', {}, stanza.getChildText('subject')),
                        ) as Stanza,
                    );
                }
            });

            const roomJid = parseJid('chatroom', 'conference.example.com');
            const room = await multiUserChatPlugin.joinRoom(roomJid);

            const newSubject = 'new subject';

            await multiUserChatPlugin.changeRoomSubject(room.roomJid, newSubject);
            expect(multiUserChatPlugin.rooms$.getValue()[0].subject).toEqual(newSubject);
        });
    });

});

function mockJoinPresenceStanza(stanza: Stanza) {
    return xml('presence', {from: stanza.attrs.to, to: stanza.attrs.from, id: stanza.attrs.id},
        xml('x', {xmlns: mucUserNs},
            xml('item', {affiliation: 'owner', role: 'moderator'}),
            xml('status', {code: '110'}),
        ),
    );
}

function mockRoomInfoStanza(stanza: Stanza) {
    return xml('iq', {
            xmlns: 'jabber:client',
            to: stanza.attrs.from,
            from: stanza.attrs.to,
            type: 'result',
            id: stanza.attrs.id,
        },
        xml('query', {xmlns: 'http://jabber.org/protocol/disco#info'},
            xml('identity', {type: 'text', category: 'conference'}),
            xml('x', {type: 'result', xmlns: 'jabber:x:data'},
                xml('field', {
                    var: 'FORM_TYPE',
                    type: 'hidden',
                }, xml('value', {}, mucRoomConfigFormNs)),
                xml('field', {var: 'muc#roomconfig_roomname', type: 'text-single'}, xml('value', {}, 'Room Name')),
                xml('field', {var: 'muc#roominfo_description', type: 'text-single'}, xml('value', {}, 'Room Desc')),
                xml('field', {var: 'muc#roomconfig_whois', type: 'list-single'}, xml('value', {}, 'moderators')),
                xml('field', {var: 'muc#roomconfig_publicroom', type: 'boolean'}, xml('value', {}, 'false')),
                xml('field', {var: 'muc#roomconfig_membersonly', type: 'boolean'}, xml('value', {}, 'true')),
                xml('field', {var: 'muc#roomconfig_persistentroom', type: 'boolean'}, xml('value', {}, 'true')),
                xml('field', {var: 'multipleValues', type: 'list-multi'},
                    xml('value', {}, 'value1'),
                    xml('value', {}, 'value2'),
                ),
            ),
        ),
    );
}

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

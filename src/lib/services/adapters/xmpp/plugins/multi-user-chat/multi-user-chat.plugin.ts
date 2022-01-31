import { jid as parseJid, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { Direction } from '../../../../../core/message';
import { IqResponseStanza, Stanza } from '../../../../../core/stanza';
import { LogService } from '../../../../log.service';
import { AbstractStanzaBuilder } from '../../abstract-stanza-builder';
import { StanzaBuilder } from '../../stanza-builder';
import { XmppChatAdapter } from '../../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from '../abstract-xmpp-plugin';
import { MessageReceivedEvent } from '../message.plugin';
import { ServiceDiscoveryPlugin } from '../service-discovery.plugin';
import { Presence } from '../../../../../core/presence';
import { Room } from './room';
import { Affiliation, AffiliationModification } from './affiliation';
import { Role, RoleModification } from './role';
import { RoomUser } from './room-user';
import { RoomOccupant } from './room-occupant';
import { Invitation } from './invitation';
import { RoomMessage } from './room-message';
import {
    Form,
    FORM_NS,
    getField,
    parseForm,
    serializeToSubmitForm,
    setFieldValue,
    TextualFormField,
} from '../../../../../core/form';
import { XmppResponseError } from '../../xmpp-response.error';
import { mucNs, mucAdminNs, mucOwnerNs, mucRoomConfigFormNs, mucUserNs } from './multi-user-chat-constants';

/**
 * see:
 * https://xmpp.org/extensions/xep-0045.html#terms-rooms
 */
export interface RoomCreationOptions extends RoomConfiguration {
    /**
     * The room id to create the room with. This is the `local` part of the room JID.
     */
    roomId: string;
    /**
     * Optional nickname to use in the room. Current user's nickname will be used if not provided.
     */
    nick?: string;
}

export interface RoomConfiguration {
    /**
     * Optional name for the room. If none is provided, room will be only identified by its JID.
     */
    name?: string;
    /**
     * A room that can be found by any user through normal means such as searching and service discovery
     */
    public?: boolean;
    /**
     * for true:
     * A room that a user cannot enter without being on the member list.
     * for false:
     * A room that non-banned entities are allowed to enter without being on the member list.
     */
    membersOnly?: boolean;
    /**
     * for true:
     * A room in which an occupant's full JID is exposed to all other occupants,
     * although the occupant can request any desired room nickname.
     * for false:
     * A room in which an occupant's full JID can be discovered by room moderators only.
     */
    nonAnonymous?: boolean;
    /**
     * for true:
     * A room that is not destroyed if the last occupant exits.
     * for false:
     * A room that is destroyed if the last occupant exits.
     */
    persistentRoom?: boolean;
    /**
     * allow ejabberd MucSub subscriptions.
     * Room occupants are allowed to subscribe to message notifications being archived while they were offline
     */
    allowSubscription?: boolean;
}

export interface RoomMetadata {
    [key: string]: any;
}

class QueryAffiliatedMemberListStanzaBuilder extends AbstractStanzaBuilder {

    constructor(
        private readonly roomJid: JID,
        private readonly queryType: 'affiliation' | 'role',
        private readonly affiliationOrRole: Affiliation | Role,
    ) {
        super();
    }

    static build(roomJid: JID, ...[queryType, affiliationOrRole]:
        [queryType: 'affiliation', affiliation: Affiliation] | [queryType: 'role', role: Role]): Stanza {
        return new QueryAffiliatedMemberListStanzaBuilder(roomJid, queryType, affiliationOrRole).toStanza();
    }

    toStanza(): Stanza {
        return xml('iq', {type: 'get', to: this.roomJid.toString()},
            xml('query', {xmlns: mucAdminNs},
                xml('item', {[this.queryType]: this.affiliationOrRole}),
            ),
        );
    }
}

class QueryOccupantListStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private readonly roomJid: JID) {
        super();
    }

    static build(roomJid: JID): Stanza {
        return new QueryOccupantListStanzaBuilder(roomJid).toStanza();
    }

    toStanza(): Stanza {
        return xml('iq', {type: 'get', to: this.roomJid.toString()},
            xml('query', {xmlns: ServiceDiscoveryPlugin.DISCO_ITEMS}),
        );
    }
}

export interface RoomSummary {
    jid: JID;
    name: string;
    roomInfo: Form | null;
}

class ModifyAffiliationsOrRolesStanzaBuilder extends AbstractStanzaBuilder {

    constructor(
        private readonly roomJid: JID,
        private readonly modifications: readonly (AffiliationModification | RoleModification)[],
    ) {
        super();
    }

    static build(
        roomJid: JID,
        modifications: readonly (AffiliationModification | RoleModification)[],
    ): Stanza {
        return new ModifyAffiliationsOrRolesStanzaBuilder(roomJid, modifications).toStanza();
    }

    toStanza(): Stanza {
        return xml('iq', {to: this.roomJid.toString(), type: 'set'},
            xml(
                'query',
                {xmlns: mucAdminNs},
                ...this.modifications.map(modification => this.buildItem(modification)),
            ),
        );
    }

    private buildItem(modification: AffiliationModification | RoleModification): Element {
        const {reason, ...attrs} = modification;
        return xml(
            'item',
            'userJid' in attrs
                ? {
                    jid: attrs.userJid.toString(),
                    affiliation: attrs.affiliation,
                }
                : {
                    nick: attrs.nick,
                    role: attrs.role,
                },
            reason ? xml('reason', {}, reason) : null,
        );
    }
}

/**
 * The MultiUserChatPlugin tries to provide the necessary functionality for a multi-user text chat,
 * whereby multiple XMPP users can exchange messages in the context of a room or channel, similar to Internet Relay Chat (IRC).
 * For more details see:
 * @see https://xmpp.org/extensions/xep-0045.html
 */
export class MultiUserChatPlugin extends AbstractXmppPlugin {
    readonly rooms$ = new BehaviorSubject<Room[]>([]);
    readonly message$ = new Subject<Room>();

    private onInvitationSubject = new Subject<Invitation>();
    readonly onInvitation$ = this.onInvitationSubject.asObservable();

    constructor(
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly logService: LogService,
        private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
    ) {
        super();
    }

    onOffline(): void {
        this.rooms$.next([]);
    }

    handleStanza(stanza: Stanza, archiveDelayElement?: Stanza): boolean {
        if (this.isRoomPresenceStanza(stanza)) {
            return this.handleRoomPresenceStanza(stanza);
        } else if (this.isRoomMessageStanza(stanza)) {
            return this.handleRoomMessageStanza(stanza, archiveDelayElement);
        } else if (this.isRoomSubjectStanza(stanza)) {
            return this.handleRoomSubjectStanza(stanza, archiveDelayElement);
        } else if (this.isRoomInvitationStanza(stanza)) {
            return this.handleRoomInvitationStanza(stanza);
        }
        return false;
    }

    /**
     * Resolves if room could be configured as requested, rejects if room did exist or server did not accept configuration.
     */
    async createRoom(options: RoomCreationOptions): Promise<Room> {
        const {roomId, nick} = options;
        const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');
        const occupantJid = parseJid(roomId, service.jid, nick);
        const {presenceResponse, room} = await this.joinRoomInternal(occupantJid);

        const itemElement = presenceResponse.getChild('x').getChild('item');
        if (itemElement.attrs.affiliation !== Affiliation.owner) {
            throw new Error('error creating room, user is not owner: ' + presenceResponse.toString());
        }

        try {
            await this.applyRoomConfiguration(room.roomJid, options);
            room.name = options.name || undefined;
            this.rooms$.next(this.rooms$.getValue());
        } catch (e) {
            this.logService.error('room configuration rejected', e);
            throw e;
        }

        return room;
    }

    async destroyRoom(roomJid: JID): Promise<IqResponseStanza<'result'>> {
        let roomDestroyedResponse: IqResponseStanza<'result'>;
        try {
            roomDestroyedResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'set', to: roomJid.toString()},
                    xml('query', {xmlns: mucOwnerNs},
                        xml('destroy'))));
        } catch (e) {
            this.logService.error('error destroying room');
            throw e;
        }

        // TODO: refactor so that we instead listen to the presence destroy stanza
        const allRoomsWithoutDestroyedRoom = this.rooms$.getValue().filter(
            room => !room.roomJid.equals(roomJid),
        );

        this.rooms$.next(allRoomsWithoutDestroyedRoom);

        return roomDestroyedResponse;
    }

    async joinRoom(occupantJid: JID): Promise<Room> {
        const {room} = await this.joinRoomInternal(occupantJid);
        this.rooms$.next(this.rooms$.getValue());
        return room;
    }

    async getRoomInfo(roomJid: JID): Promise<Form | null> {
        const roomInfoResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: roomJid.toString()},
                xml('query', {xmlns: ServiceDiscoveryPlugin.DISCO_INFO}),
            ),
        );
        const formEl = roomInfoResponse
            .getChild('query', ServiceDiscoveryPlugin.DISCO_INFO)
            ?.getChild('x', FORM_NS);

        if (formEl) {
            return parseForm(formEl);
        }

        return null;
    }

    async queryAllRooms(): Promise<RoomSummary[]> {
        const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');
        const to = conferenceServer.jid.toString();

        const result: RoomSummary[] = [];

        let roomQueryResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to},
                xml('query', {xmlns: ServiceDiscoveryPlugin.DISCO_ITEMS}),
            ),
        );
        result.push(...this.extractRoomSummariesFromResponse(roomQueryResponse));

        let resultSet = this.extractResultSetFromResponse(roomQueryResponse);
        while (resultSet && resultSet.getChild('last')) {
            const lastReceivedRoom = resultSet.getChildText('last');
            roomQueryResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'get', to},
                    xml('query', {xmlns: ServiceDiscoveryPlugin.DISCO_ITEMS},
                        xml('set', {xmlns: 'http://jabber.org/protocol/rsm'},
                            xml('max', {}, 250),
                            xml('after', {}, lastReceivedRoom),
                        ),
                    ),
                ),
            );
            result.push(...this.extractRoomSummariesFromResponse(roomQueryResponse));
            resultSet = this.extractResultSetFromResponse(roomQueryResponse);
        }

        await Promise.all(
            result.map(async (summary) => {
                summary.roomInfo = await this.getRoomInfo(summary.jid);
            }),
        );

        return result;
    }

    /**
     * Get all members of a MUC-Room with their affiliation to the room using the rooms fullJid
     * @param roomJid jid of the room
     */
    async queryUserList(roomJid: JID): Promise<RoomUser[]> {
        const memberQueryResponses = await Promise.all(
            [
                ...Object
                    .values(Affiliation)
                    .map(affiliation =>
                        this.xmppChatAdapter.chatConnectionService.sendIq(
                            QueryAffiliatedMemberListStanzaBuilder.build(roomJid, 'affiliation', affiliation),
                        ),
                    ),
                ...Object
                    .values(Role)
                    .map(role =>
                        this.xmppChatAdapter.chatConnectionService.sendIq(
                            QueryAffiliatedMemberListStanzaBuilder.build(roomJid, 'role', role),
                        ),
                    ),
            ],
        );
        const members = new Map<string, RoomUser>();
        for (const memberQueryResponse of memberQueryResponses) {
            memberQueryResponse
                .getChild('query', mucAdminNs)
                .getChildren('item')
                .forEach((memberItem: Element) => {
                    const userJid = parseJid(memberItem.attrs.jid);
                    const roomUser = members.get(userJid.bare().toString()) || {
                        userIdentifiers: [],
                        affiliation: Affiliation.none,
                        role: Role.none,
                    } as RoomUser;
                    roomUser.userIdentifiers.push({
                        userJid,
                        nick: memberItem.attrs.nick && memberItem.attrs.nick,
                    });
                    // tslint:disable no-unused-expression
                    memberItem.attrs.affiliation && (roomUser.affiliation = memberItem.attrs.affiliation);
                    memberItem.attrs.role && (roomUser.role = memberItem.attrs.role);
                    // tslint:enable no-unused-expression
                    members.set(userJid.bare().toString(), roomUser);
                });
        }

        return [...members.values()];
    }

    async modifyAffiliationOrRole(roomJid: JID, modification: AffiliationModification | RoleModification): Promise<IqResponseStanza> {
        return await this.xmppChatAdapter.chatConnectionService.sendIq(
            ModifyAffiliationsOrRolesStanzaBuilder.build(roomJid, [modification]),
        );
    }

    async sendMessage(room: Room, body: string, thread?: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        const roomJid = room.roomJid.toString();
        const roomMessageStanza =
            thread
                ? StanzaBuilder.buildRoomMessageWithThread(from, roomJid, body, thread)
                : StanzaBuilder.buildRoomMessageWithBody(from, roomJid, body);

        for (const plugin of this.xmppChatAdapter.plugins) {
            plugin.beforeSendMessage(roomMessageStanza);
        }

        return await this.xmppChatAdapter.chatConnectionService.send(roomMessageStanza);
    }

    /**
     * requests a configuration form for a room which returns with the default values
     * for an example see:
     * https://xmpp.org/extensions/xep-0045.html#registrar-formtype-owner
     */
    async getRoomConfiguration(roomJid: JID): Promise<Form> {
        const configurationForm = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: roomJid.toString()},
                xml('query', {xmlns: mucOwnerNs}),
            ),
        );

        const formElement = configurationForm.getChild('query').getChild('x', FORM_NS);
        if (!formElement) {
            throw new Error('room not configurable');
        }

        return parseForm(formElement);
    }

    async applyRoomConfiguration(roomJid: JID, roomConfiguration: RoomConfiguration): Promise<void> {
        const roomConfigForm = await this.getRoomConfiguration(roomJid);

        const formTypeField = getField(roomConfigForm, 'FORM_TYPE') as TextualFormField | undefined;
        if (formTypeField.value !== mucRoomConfigFormNs) {
            throw new Error(`unexpected form type for room configuration form: formType=${formTypeField.value}, formTypeField=${JSON.stringify(formTypeField)}`);
        }

        if (typeof roomConfiguration.name === 'string') {
            setFieldValue(roomConfigForm, 'text-single', 'muc#roomconfig_roomname', roomConfiguration.name);
        }
        if (typeof roomConfiguration.nonAnonymous === 'boolean') {
            setFieldValue(
                roomConfigForm,
                'list-single',
                'muc#roomconfig_whois',
                roomConfiguration.nonAnonymous ? 'anyone' : 'moderators',
            );
        }
        if (typeof roomConfiguration.public === 'boolean') {
            setFieldValue(roomConfigForm, 'boolean', 'muc#roomconfig_publicroom', roomConfiguration.public);
        }
        if (typeof roomConfiguration.membersOnly === 'boolean') {
            setFieldValue(roomConfigForm, 'boolean', 'muc#roomconfig_membersonly', roomConfiguration.membersOnly);
        }
        if (typeof roomConfiguration.persistentRoom === 'boolean') {
            setFieldValue(roomConfigForm, 'boolean', 'muc#roomconfig_persistentroom', roomConfiguration.persistentRoom);
        }
        if (typeof roomConfiguration.allowSubscription === 'boolean') {
            setFieldValue(roomConfigForm, 'boolean', 'allow_subscription', roomConfiguration.allowSubscription);
        }

        await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set', to: roomJid.toString()},
                xml('query', {xmlns: mucOwnerNs},
                    serializeToSubmitForm(roomConfigForm),
                ),
            ),
        );
    }

    getRoomByJid(jid: JID): Room | undefined {
        return this.rooms$.getValue().find(room => room.roomJid.equals(jid.bare()));
    }

    async banUser(occupantJid: JID, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
        const userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

        const response = await this.modifyAffiliationOrRole(roomJid, {
            userJid: userJid.bare(),
            affiliation: Affiliation.outcast,
            reason,
        });
        this.logService.debug(`ban response ${response.toString()}`);

        return response;
    }

    async unbanUser(occupantJid: JID, roomJid: JID): Promise<IqResponseStanza> {
        const userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

        const banList = (await this.getBanList(roomJid)).map(bannedUser => bannedUser.userJid);
        this.logService.debug(`ban list: ${JSON.stringify(banList)}`);

        if (!banList.find(bannedJid => bannedJid.equals(userJid))) {
            throw new Error(`error unbanning: ${userJid} isn't on the ban list`);
        }

        const response = await this.modifyAffiliationOrRole(roomJid, {userJid, affiliation: Affiliation.none});
        this.logService.debug('unban response: ' + response.toString());

        return response;
    }

    async getBanList(roomJid: JID): Promise<AffiliationModification[]> {
        const iq = xml('iq', {to: roomJid.toString(), type: 'get'},
            xml('query', {xmlns: mucAdminNs},
                xml('item', {affiliation: Affiliation.outcast}),
            ),
        );
        const response = await this.xmppChatAdapter.chatConnectionService.sendIq(iq);

        return response.getChild('query').getChildren('item').map(item => ({
            userJid: parseJid(item.attrs.jid),
            affiliation: item.attrs.affiliation,
            reason: item.getChild('reason')?.getText(),
        }));
    }

    async inviteUser(inviteeJid: JID, roomJid: JID, invitationMessage?: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        const stanza = xml('message', {to: roomJid.toString(), from},
            xml('x', {xmlns: mucUserNs},
                xml('invite', {to: inviteeJid.toString()},
                    invitationMessage ? xml('reason', {}, invitationMessage) : null,
                ),
            ),
        );
        await this.xmppChatAdapter.chatConnectionService.send(stanza);
    }

    async declineRoomInvite(occupantJid: JID, reason?: string) {
        const to = occupantJid.bare().toString();
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        const stanza = xml('message', {to, from},
            xml('x', {xmlns: mucUserNs},
                xml('decline', {to},
                    reason ? xml('reason', {}, reason) : null
                ),
            ),
        );
        await this.xmppChatAdapter.chatConnectionService.send(stanza);
    }

    async kickOccupant(nick: string, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
        const response = await this.modifyAffiliationOrRole(roomJid, {nick, role: Role.none, reason});
        this.logService.debug(`kick occupant response: ${response.toString()}`);
        return response;
    }

    async changeUserNickname(newNick: string, roomJid: JID): Promise<void> {
        const newRoomJid = parseJid(roomJid.toString());
        newRoomJid.resource = newNick;
        const stanza = xml('presence', {
            to: newRoomJid.toString(),
            from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
        });
        await this.xmppChatAdapter.chatConnectionService.send(stanza);
    }

    async leaveRoom(occupantJid: JID, status?: string): Promise<void> {
        const stanza = xml('presence', {
                to: occupantJid.toString(),
                from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
                type: Presence[Presence.unavailable],
            },
            status ? xml('status', {}, status) : null,
        );

        await this.xmppChatAdapter.chatConnectionService.send(stanza);
        this.logService.debug(`occupant left room: occupantJid=${occupantJid.toString()}`);
    }

    async changeRoomSubject(roomJid: JID, subject: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        await this.xmppChatAdapter.chatConnectionService.send(
            xml('message', {to: roomJid.toString(), from, type: 'groupchat'},
                xml('subject', {}, subject),
            ),
        );
        this.logService.debug(`room subject changed: roomJid=${roomJid.toString()}, new subject=${subject}`);
    }

    isRoomInvitationStanza(stanza: Stanza): boolean {
        let x: Element | undefined;
        return stanza.name === 'message'
            && (x = stanza.getChild('x', mucUserNs)) != null
            && (x.getChild('invite') != null || x.getChild('decline') != null);
    }

    async grantMembership(userJid: JID, roomJid: JID, reason?: string) {
        await this.setAffiliation(userJid, roomJid, Affiliation.member, reason);
    }

    async revokeMembership(userJid: JID, roomJid: JID, reason?: string) {
        await this.setAffiliation(userJid, roomJid, Affiliation.none, reason);
    }

    async grantAdmin(userJid: JID, roomJid: JID, reason?: string) {
        await this.setAffiliation(userJid, roomJid, Affiliation.admin, reason);
    }

    async revokeAdmin(userJid: JID, roomJid: JID, reason?: string) {
        await this.setAffiliation(userJid, roomJid, Affiliation.member, reason);
    }

    async grantModeratorStatus(occupantNick: string, roomJid: JID, reason?: string) {
        await this.setRole(occupantNick, roomJid, Role.moderator, reason);
    }

    async revokeModeratorStatus(occupantNick: string, roomJid: JID, reason?: string) {
        await this.setRole(occupantNick, roomJid, Role.participant, reason);
    }

    private isRoomPresenceStanza(stanza: Stanza): boolean {
        return stanza.name === 'presence' && (
            stanza.getChild('x', mucNs)
            || stanza.getChild('x', mucUserNs)
        ) != null;
    }

    private handleRoomPresenceStanza(stanza: Stanza): boolean {
        const stanzaType = stanza.attrs.type;

        if (stanzaType === 'error') {
            this.logService.error(stanza);
            throw new Error('error handling message, stanza: ' + stanza);
        }

        const occupantJid = parseJid(stanza.attrs.from);
        const roomJid = occupantJid.bare();

        const xEl = stanza.getChild('x', mucUserNs);

        const itemEl = xEl.getChild('item');
        const subjectOccupant: RoomOccupant = {
            occupantJid,
            affiliation: itemEl.attrs.affiliation,
            role: itemEl.attrs.role,
            nick: occupantJid.resource,
        };

        const room = this.getOrCreateRoom(occupantJid);
        const statusCodes: string[] = xEl.getChildren('status').map(status => status.attrs.code);
        const isCurrenUser = statusCodes.includes('110');
        if (stanzaType === 'unavailable') {
            const actor = itemEl.getChild('actor')?.attrs.nick;
            const reason = itemEl.getChild('reason')?.getText();

            if (statusCodes.includes('333')) {
                if (isCurrenUser) {
                    this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
                }
                return room.handleOccupantConnectionError(subjectOccupant, isCurrenUser);
            } else if (statusCodes.includes('307')) {
                if (isCurrenUser) {
                    this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
                }
                return room.handleOccupantKicked(subjectOccupant, isCurrenUser, actor, reason);
            } else if (statusCodes.includes('301')) {
                if (isCurrenUser) {
                    this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
                }
                return room.handleOccupantBanned(subjectOccupant, isCurrenUser, actor, reason);
            } else if (statusCodes.includes('303')) {
                const handled = room.handleOccupantChangedNick(subjectOccupant, isCurrenUser, xEl.getChild('item').attrs.nick);
                if (handled && isCurrenUser) {
                    this.rooms$.next(this.rooms$.getValue());
                }
                return handled;
            } else if (statusCodes.includes('321')) {
                if (isCurrenUser) {
                    this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
                }
                return room.handleOccupantLostMembership(subjectOccupant, isCurrenUser);
            } else {
                if (isCurrenUser) {
                    this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
                }
                return room.handleOccupantLeft(subjectOccupant, isCurrenUser);
            }
        } else if (!stanzaType) {
            if (room.hasOccupant(subjectOccupant.occupantJid)) {
                const oldOccupant = room.getOccupant(subjectOccupant.occupantJid);
                return room.handleOccupantModified(subjectOccupant, oldOccupant, isCurrenUser);
            } else {
                return room.handleOccupantJoined(subjectOccupant, isCurrenUser);
            }
        }

        return false;
    }

    private getOrCreateRoom(roomJid: JID): Room {
        roomJid = roomJid.bare();
        let room = this.getRoomByJid(roomJid);
        if (!room) {
            room = new Room(roomJid, this.logService);
            this.rooms$.next([room, ...this.rooms$.getValue()]);
        }
        return room;
    }

    private async joinRoomInternal(roomJid: JID): Promise<{ presenceResponse: Stanza, room: Room }> {
        if (this.getRoomByJid(roomJid.bare())) {
            throw new Error('can not join room more than once: ' + roomJid.bare().toString());
        }
        const userJid = this.xmppChatAdapter.chatConnectionService.userJid;
        const occupantJid = parseJid(roomJid.local, roomJid.domain, roomJid.resource || userJid.local);

        let roomInfo: Form | null = null;
        try {
            roomInfo = await this.getRoomInfo(occupantJid.bare());
        } catch (e) {
            if (!(e instanceof XmppResponseError) || e.errorCondition !== 'item-not-found') {
                throw e;
            }
        }

        try {
            const presenceResponse = await this.xmppChatAdapter.chatConnectionService.sendAwaitingResponse(
                xml('presence', {to: occupantJid.toString()},
                    xml('x', {xmlns: mucNs}),
                ),
            );
            this.handleRoomPresenceStanza(presenceResponse);

            const room = this.getOrCreateRoom(occupantJid.bare());
            room.nick = occupantJid.resource;
            if (roomInfo) {
                room.name = getField(roomInfo, 'muc#roomconfig_roomname')?.value as string | undefined;
                room.description = getField(roomInfo, 'muc#roominfo_description')?.value as string | undefined || '';
            }

            return {presenceResponse, room};
        } catch (e) {
            this.logService.error('error joining room', e);
            throw e;
        }
    }

    private extractRoomSummariesFromResponse(iq: IqResponseStanza): RoomSummary[] {
        return iq
            .getChild('query', ServiceDiscoveryPlugin.DISCO_ITEMS)
            ?.getChildren('item')
            ?.reduce<RoomSummary[]>((acc, item) => {
                const {jid, name} = item.attrs;

                if (typeof jid === 'string' && typeof name === 'string') {
                    acc.push({
                        jid: parseJid(jid),
                        name,
                        roomInfo: null,
                    });
                }

                return acc;
            }, []) || [];
    }

    private extractResultSetFromResponse(iq: IqResponseStanza): Stanza {
        return iq
            .getChild('query', ServiceDiscoveryPlugin.DISCO_ITEMS)
            ?.getChild('set', 'http://jabber.org/protocol/rsm');
    }

    private isRoomMessageStanza(stanza: Stanza): boolean {
        return stanza.name === 'message' && stanza.attrs.type === 'groupchat' && !!stanza.getChildText('body')?.trim();
    }

    private handleRoomMessageStanza(messageStanza: Stanza, archiveDelayElement?: Stanza): boolean {
        const delayElement = archiveDelayElement ?? messageStanza.getChild('delay');
        const datetime = delayElement?.attrs.stamp
            ? new Date(delayElement.attrs.stamp)
            : new Date() /* TODO: replace with entity time plugin */;

        const from = parseJid(messageStanza.attrs.from);
        const room = this.getRoomByJid(from.bare());
        if (!room) {
            // there are several reasons why we can receive a message for an unknown room:
            // - this is a message delivered via MAM/MUCSub but the room it was stored for
            //   - is gone (was destroyed)
            //   - user was banned from room
            //   - room wasn't joined yet
            // - this is some kind of error on developer's side
            this.logService.warn(`received stanza for unknown room: ${from.bare().toString()}`);
            return false;
        }

        const message: RoomMessage = {
            body: messageStanza.getChildText('body').trim(),
            datetime,
            id: messageStanza.attrs.id,
            from,
            direction: from.equals(room.occupantJid) ? Direction.out : Direction.in,
            delayed: !!delayElement,
            fromArchive: archiveDelayElement != null,
        };

        const messageReceivedEvent = new MessageReceivedEvent();
        for (const plugin of this.xmppChatAdapter.plugins) {
            plugin.afterReceiveMessage(message, messageStanza, messageReceivedEvent);
        }
        if (!messageReceivedEvent.discard) {
            room.addMessage(message);
        }

        if (!message.delayed) {
            this.message$.next(room);
        }

        return true;
    }

    private isRoomSubjectStanza(stanza: Stanza): boolean {
        return stanza.name === 'message'
            && stanza.attrs.type === 'groupchat'
            && stanza.getChild('subject') != null
            && stanza.getChild('body') == null;
    }

    private handleRoomSubjectStanza(stanza: Stanza, archiveDelayElement: Stanza): boolean {
        const roomJid = parseJid(stanza.attrs.from).bare();
        const room = this.getRoomByJid(roomJid);

        if (!room) {
            throw new Error(`unknown room trying to change room subject: roomJid=${roomJid.toString()}`);
        }

        // The archive only stores non-empty subjects. The current value of the subject is sent directly after entering a room by the room,
        // not the archive.
        // If a subject was first set, then unset, we would first receive the empty subject on room entry and then overwrite it with the
        // previous non-empty value from archive. This is why we want to always ignore subjects from archive.
        // This actually looks like a bug in MAM, it seems that MAM interprets messages with just subject in them as if they were chat
        // messages and not room metadata. This would explain why empty subjects are not stored.
        if (archiveDelayElement) {
            return true;
        }

        room.subject = stanza.getChild('subject').getText().trim();
        this.rooms$.next(this.rooms$.getValue());

        return true;
    }

    private handleRoomInvitationStanza(stanza: Stanza): boolean {
        const xEl = stanza.getChild('x', mucUserNs);
        const invitationEl = xEl.getChild('invite') ?? xEl.getChild('decline');

        this.onInvitationSubject.next({
            type: invitationEl.name as Invitation['type'],
            roomJid: parseJid(stanza.attrs.from),
            roomPassword: xEl.getChild('password')?.getText(),
            from: parseJid(invitationEl.attrs.from),
            message: invitationEl.getChild('reason')?.getText(),
        });

        return true;
    }

    private async setAffiliation(occupantJid: JID, roomJid: JID, affiliation: Affiliation, reason?: string): Promise<IqResponseStanza> {
        const userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

        return await this.modifyAffiliationOrRole(roomJid, {userJid, affiliation, reason});
    }

    private async setRole(occupantNick: string, roomJid: JID, role: Role, reason?: string): Promise<IqResponseStanza> {
        return await this.modifyAffiliationOrRole(roomJid, {nick: occupantNick, role, reason});
    }

    private async getUserJidByOccupantJid(occupantJid: JID, roomJid: JID): Promise<JID> {
        const users = await this.queryUserList(roomJid);
        return users.find(roomUser => roomUser.userIdentifiers.find(
            ids => ids.nick === occupantJid.resource || ids.userJid.bare().equals(occupantJid.bare())),
        )?.userIdentifiers?.[0].userJid;
    }
}

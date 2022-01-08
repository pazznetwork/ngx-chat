import { jid as parseJid, xml } from '@xmpp/client';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { dummyAvatarRoom } from '../../../../core/contact-avatar';
import { Direction, Message } from '../../../../core/message';
import { DateMessagesGroup, MessageStore } from '../../../../core/message-store';
import { isJid, Recipient } from '../../../../core/recipient';
import { IqResponseStanza, Stanza } from '../../../../core/stanza';
import { LogService } from '../../../log.service';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { StanzaBuilder } from '../stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { MessageReceivedEvent } from './message.plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';
import { Presence } from '../../../../core/presence';
import { JID } from '@xmpp/jid';

/**
 * see:
 * https://xmpp.org/extensions/xep-0045.html#terms-rooms
 */
export interface RoomCreationOptions {
    name?: string;
    roomId: string;
    /**
     * A room that can be found by any user through normal means such as searching and service discovery
     */
    public: boolean;
    /**
     * for true:
     * A room that a user cannot enter without being on the member list.
     * for false:
     * A room that non-banned entities are allowed to enter without being on the member list.
     */
    membersOnly: boolean;
    /**
     * for true:
     * A room in which an occupant's full JID is exposed to all other occupants,
     * although the occupant can request any desired room nickname.
     * for false:
     * A room in which an occupant's full JID can be discovered by room admins only.
     */
    nonAnonymous: boolean;
    /**
     * for true:
     * A room that is not destroyed if the last occupant exits.
     * for false:
     * A room that is destroyed if the last occupant exits.
     */
    persistentRoom: boolean;
    /**
     * Optional name for the room. If none is provided, room will be only identified by its jid
     */
    nick?: string;
    /**
     * allow ejabberd MucSub subscriptions.
     * Room occupants are allowed to subscribe to message notifications being archived while they were offline
     */
    allowSubscription?: boolean;
}

export interface RoomMessage extends Message {
    from: JID;
}

export interface RoomOccupant {
    occupantJid: JID;
    affiliation: Affiliation;
    nick: string;
    role: Role;
}

export interface RoomUser {
    userIdentifiers: {
        userJid: JID,
        nick?: string
    }[];
    affiliation?: Affiliation;
    role?: Role;
}

export interface RoomMetadata {
    [key: string]: any;
}

export class Room {

    readonly recipientType = 'room';
    readonly roomJid: JID;
    occupantJid: JID | undefined;
    name: string;
    avatar = dummyAvatarRoom;
    metadata: RoomMetadata = {};
    private messageStore: MessageStore<RoomMessage>;

    get jidBare(): JID {
        return this.roomJid;
    }

    constructor(roomJid: JID, logService: LogService, nick?: string, name?: string) {
        this.roomJid = roomJid.bare();
        this.name = name ?? this.roomJid.toString();
        if (nick) {
            this.setNick(nick);
        }
        this.messageStore = new MessageStore<RoomMessage>(logService);
    }

    get messages$(): Subject<RoomMessage> {
        return this.messageStore.messages$;
    }

    get messages(): RoomMessage[] {
        return this.messageStore.messages;
    }

    get dateMessagesGroups(): DateMessagesGroup<RoomMessage>[] {
        return this.messageStore.dateMessageGroups;
    }

    get oldestMessage(): RoomMessage {
        return this.messageStore.oldestMessage;
    }

    get mostRecentMessage(): RoomMessage {
        return this.messageStore.mostRecentMessage;
    }

    get mostRecentMessageReceived(): RoomMessage {
        return this.messageStore.mostRecentMessageReceived;
    }

    get mostRecentMessageSent(): RoomMessage {
        return this.messageStore.mostRecentMessageSent;
    }

    setNick(nick: string): void {
        this.occupantJid = parseJid(`${this.roomJid}/${nick}`);
    }

    addMessage(message: RoomMessage): void {
        this.messageStore.addMessage(message);
    }

    equalsBareJid(other: Recipient | JID): boolean {
        if (other instanceof Room || isJid(other)) {
            const otherJid = other instanceof Room ? other.roomJid : other.bare();
            return this.roomJid.equals(otherJid);
        }
        return false;
    }

}

export enum Affiliation {
    none = 'none',
    outcast = 'outcast',
    member = 'member',
    admin = 'admin',
    owner = 'owner',
}

export enum Role {
    none = 'none',
    visitor = 'visitor',
    participant = 'participant',
    moderator = 'moderator',
}

export interface Invitation {
    type: 'invite' | 'decline';
    roomJid: JID;
    roomPassword?: string;
    from: JID;
    message?: string;
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
            xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
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
}

export interface AffiliationModification {
    userJid: JID;
    affiliation: Affiliation;
    reason?: string;
}

export interface RoleModification {
    nick: string;
    role: Role;
    reason?: string;
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
                {xmlns: MultiUserChatPlugin.MUC_ADMIN},
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
    public static readonly MUC = 'http://jabber.org/protocol/muc';
    public static readonly MUC_USER = 'http://jabber.org/protocol/muc#user';
    public static readonly MUC_ADMIN = 'http://jabber.org/protocol/muc#admin';
    public static readonly MUC_OWNER = 'http://jabber.org/protocol/muc#owner';
    public static readonly MUC_ROOM_CONFIG = 'http://jabber.org/protocol/muc#roomconfig';
    public static readonly MUC_REQUEST = 'http://jabber.org/protocol/muc#request';

    readonly rooms$ = new BehaviorSubject<Room[]>([]);
    readonly message$ = new Subject<Room>();
    private readonly roomJoinResponseHandlers = new Map<string, [(stanza: Stanza) => void, (e: Error) => void]>();

    private onOccupantJoinedSubject = new Subject<RoomOccupant>();
    readonly onOccupantJoined$ = this.onOccupantJoinedSubject.asObservable();

    private onOccupantLeftSubject = new Subject<RoomOccupant>();
    readonly onOccupantLeft$ = this.onOccupantLeftSubject.asObservable();

    private onOccupantKickedSubject = new Subject<RoomOccupant>();
    readonly onOccupantKicked$ = this.onOccupantKickedSubject.asObservable();

    private onOccupantBannedSubject = new Subject<RoomOccupant>();
    readonly onOccupantBanned$ = this.onOccupantBannedSubject.asObservable();

    private onOccupantChangedNickSubject = new Subject<{ occupant: RoomOccupant, newNick: string }>();
    readonly onOccupantChangedNick$ = this.onOccupantChangedNickSubject.asObservable();

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
        this.roomJoinResponseHandlers.forEach(([, reject]) => reject(new Error('offline')));
        this.roomJoinResponseHandlers.clear();
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

    private isRoomPresenceStanza(stanza: Stanza): boolean {
        return stanza.name === 'presence' && (
            stanza.getChild('x', MultiUserChatPlugin.MUC)
            || stanza.getChild('x', MultiUserChatPlugin.MUC_USER)
        ) != null;
    }

    private handleRoomPresenceStanza(stanza: Stanza): boolean {
        const joinRoomResponseHandled = this.handleJoinRoomResponse(stanza);

        const stanzaType = stanza.attrs.type;

        if (stanzaType === 'error') {
            this.handlerErrorMessage(stanza);
        }

        const occupantJid = parseJid(stanza.attrs.from);
        const roomJid = occupantJid.bare();

        const x = stanza.getChild('x', MultiUserChatPlugin.MUC_USER);

        const itemEl = x.getChild('item');
        const subjectOccupant: RoomOccupant = {
            occupantJid,
            affiliation: itemEl.attrs.affiliation,
            role: itemEl.attrs.role,
            nick: occupantJid.resource,
        };

        let stanzaHandled = false;
        if (stanzaType === 'unavailable') {
            const statusCodes: string[] = x.getChildren('status').map(status => status.attrs.code);

            if (statusCodes.includes('307') && subjectOccupant.affiliation === Affiliation.none) {
                const actor = itemEl.getChild('actor')?.attrs.nick;
                const reason = itemEl.getChild('reason')?.getText();

                stanzaHandled = this.handleOccupantKicked(subjectOccupant, roomJid, statusCodes.includes('110'), actor, reason);
            } else if (statusCodes.includes('301') && subjectOccupant.affiliation === Affiliation.outcast) {
                const actor = itemEl.getChild('actor')?.attrs.nick;
                const reason = itemEl.getChild('reason')?.getText();

                stanzaHandled = this.handleOccupantBanned(subjectOccupant, roomJid, itemEl.attrs.jid == null, actor, reason);
            } else if (statusCodes.includes('303')) {
                stanzaHandled = this.handleOccupantChangedNick(
                    subjectOccupant,
                    x.getChild('item').attrs.nick,
                    statusCodes,
                );
            } else {
                stanzaHandled = this.handleOccupantLeft(subjectOccupant, roomJid, statusCodes.includes('110'));
            }
        } else if (!stanzaType) {
            const room = this.getOrCreateRoom(occupantJid);
            stanzaHandled = this.handleOccupantJoined(subjectOccupant, room.roomJid);
        }

        return joinRoomResponseHandled || stanzaHandled;
    }

    private handleJoinRoomResponse(stanza: Stanza): boolean {
        const [handleResponse, handleResponseError] = this.roomJoinResponseHandlers.get(stanza.attrs.from) ?? [];

        if (handleResponse == null || handleResponseError == null) {
            return false;
        }

        this.roomJoinResponseHandlers.delete(stanza.attrs.from);

        if (stanza.attrs.type === 'error') {
            handleResponseError(new Error('error received as response to join room request, stanza: ' + stanza));
            return true;
        }

        handleResponse(stanza);
        return true;
    }

    private handleOccupantJoined(occupant: RoomOccupant, roomJid: JID): boolean {
        this.logService.debug(`user '${occupant}' joined room '${roomJid.toString()}'`);
        this.onOccupantJoinedSubject.next(occupant);
        return true;
    }

    private handleOccupantLeft(occupant: RoomOccupant, roomJid: JID, isCurrentUser: boolean): boolean {
        if (isCurrentUser) {
            this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
        }
        this.logService.debug(`user ${occupant.occupantJid.toString()} left room '${roomJid.toString()}'`);
        this.onOccupantLeftSubject.next(occupant);
        return true;
    }

    private handleOccupantKicked(occupant: RoomOccupant, roomJid: JID, isCurrentUser: boolean, actor?: string, reason?: string): boolean {
        if (isCurrentUser) {
            this.logService.info(`you got kicked from room! room jid: ${roomJid.toString()}, by: ${actor}, with reason: ${reason}`);
            this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
        }
        this.logService.debug(`user got kicked: ${JSON.stringify(occupant)}`);
        this.onOccupantKickedSubject.next(occupant);
        return true;
    }

    private handleOccupantBanned(occupant: RoomOccupant, roomJid: JID, isCurrentUser: boolean, actor?: string, reason?: string): boolean {
        if (isCurrentUser) {
            this.logService.info(`you got banned from room! room jid: ${roomJid.toString()}, by: ${actor}, with reason: ${reason}`);
            this.rooms$.next(this.rooms$.getValue().filter(r => !r.jidBare.equals(roomJid)));
        }
        this.logService.debug(`user got banned: ${JSON.stringify(occupant)}`);
        this.onOccupantBannedSubject.next(occupant);
        return true;
    }

    private handleOccupantChangedNick(occupant: RoomOccupant, newNick: string, statusCodes: string[]): boolean {
        this.logService.debug(`user changed nick from ${occupant.nick} to ${newNick}`);
        this.onOccupantChangedNickSubject.next({occupant, newNick});
        if (statusCodes.includes('110')) {
            const room = this.rooms$.getValue().find(r => r.roomJid.equals(occupant.occupantJid.bare()));
            if (room) {
                room.setNick(newNick);
                this.rooms$.next(this.rooms$.getValue());
            }
        }
        return true;
    }

    private handlerErrorMessage(stanza: Stanza) {
        this.logService.error(stanza);
        throw new Error('error handling message, stanza: ' + stanza);
    }

    /**
     * Resolves if room could be configured as requested, rejects if room did exist or server did not accept configuration.
     */
    async createRoom(request: RoomCreationOptions): Promise<Room> {
        const {roomId, nick, name} = request;
        const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');
        const occupantJid = parseJid(roomId, service.jid, nick);
        const {presenceResponse, room} = await this.joinRoomInternal(occupantJid, name);

        const itemElement = presenceResponse.getChild('x').getChild('item');
        if (itemElement.attrs.affiliation !== Affiliation.owner) {
            throw new Error('error creating room, user is not owner: ' + presenceResponse.toString());
        }

        /**
         * requests a configuration form for a room which returns with the default values
         * for an example see:
         * https://xmpp.org/extensions/xep-0045.html#registrar-formtype-owner
         */
        const configurationForm = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: room.roomJid.toString()},
                xml('query', {xmlns: MultiUserChatPlugin.MUC_OWNER}),
            ),
        );

        const configurationListElement = configurationForm.getChild('query').getChild('x');
        if (!configurationListElement) {
            throw new Error('room not configurable');
        }

        const roomConfigurationOptions =
            this.applyRoomCreationRequestOptions(
                this.extractDefaultConfiguration(configurationListElement.getChildren('field')),
                request,
            );

        try {
            await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'set', to: room.roomJid.toString()},
                    xml('query', {xmlns: MultiUserChatPlugin.MUC_OWNER},
                        xml('x', {xmlns: 'jabber:x:data', type: 'submit'},
                            xml('field', {var: 'FORM_TYPE'},
                                xml('value', {}, MultiUserChatPlugin.MUC_ROOM_CONFIG),
                            ),
                            ...this.configurationToElements(roomConfigurationOptions),
                        ),
                    ),
                ),
            );
            return room;
        } catch (e) {
            this.logService.error('room configuration rejected', e);
            throw e;
        }
    }

    private getOrCreateRoom(roomJid: JID, nick?: string, name?: string): Room {
        roomJid = roomJid.bare();
        let room = this.getRoomByJid(roomJid);
        if (!room) {
            room = new Room(roomJid, this.logService, nick, name);
            this.rooms$.next([room].concat(this.rooms$.getValue()));
        }
        if (nick && !room.occupantJid) {
            room.setNick(nick);
            this.rooms$.next(this.rooms$.getValue());
        }
        return room;
    }

    async destroyRoom(roomJid: JID): Promise<IqResponseStanza<'result'>> {
        let roomDestroyedResponse: IqResponseStanza<'result'>;
        try {
            roomDestroyedResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'set', to: roomJid.toString()},
                    xml('query', {xmlns: MultiUserChatPlugin.MUC_OWNER},
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

    private async joinRoomInternal(roomJid: JID, name?: string | undefined): Promise<{ presenceResponse: Stanza, room: Room }> {
        if (this.getRoomByJid(roomJid.bare())) {
            throw new Error('can not join room more than once: ' + roomJid.bare().toString());
        }
        const userJid = this.xmppChatAdapter.chatConnectionService.userJid;
        const occupantJid = parseJid(roomJid.local, roomJid.domain, roomJid.resource || userJid.local);

        let rejectRoomJoinedPromise: (e: Error) => void;
        const roomJoinedPromise = new Promise<Stanza>(
            (resolve, reject) => {
                this.roomJoinResponseHandlers.set(occupantJid.toString(), [resolve, reject]);
                rejectRoomJoinedPromise = reject;
            },
        );

        try {
            await this.xmppChatAdapter.chatConnectionService.send(
                xml('presence', {from: userJid.toString(), to: occupantJid.toString()},
                    xml('x', {xmlns: MultiUserChatPlugin.MUC}),
                ),
            );
        } catch (e) {
            this.logService.error('error sending presence stanza to join a room', e);
            this.roomJoinResponseHandlers.delete(occupantJid.toString());
            rejectRoomJoinedPromise(e);
            throw e;
        }

        const presenceResponse = await roomJoinedPromise;
        if (presenceResponse.getChild('error')) {
            throw new Error('error joining room: ' + presenceResponse.toString());
        }

        return {presenceResponse, room: this.getOrCreateRoom(occupantJid.bare(), occupantJid.resource, name)};
    }

    async joinRoom(occupantJid: JID): Promise<Room> {
        return (await this.joinRoomInternal(occupantJid)).room;
    }

    async queryAllRooms(): Promise<RoomSummary[]> {
        const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');
        const to = conferenceServer.jid.toString();

        const result = [];

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
        return result;
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

    /**
     * Get all members of a MUC-Room with their affiliation to the room using the rooms fullJid
     * @param roomJid jid of the room
     */
    async queryMemberList(roomJid: JID): Promise<RoomUser[]> {
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
                .getChild('query', MultiUserChatPlugin.MUC_ADMIN)
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

    private configurationToElements(configurationOptions: Map<string, string[]>): Element[] {
        return [...configurationOptions.entries()]
            .map(([configurationKey, configurationValues]) =>
                xml('field', {var: configurationKey},
                    ...configurationValues.map(value => xml('value', {}, value))));
    }

    private extractDefaultConfiguration(fields: Element[]): Map<string, string[]> {
        const entries = fields
            .filter(field => field.attrs.type !== 'hidden')
            .map((field) => ([
                field.attrs.var as string,
                field.getChildren('value').map(value => value.getText()),
            ] as const));

        return new Map(entries);
    }

    private applyRoomCreationRequestOptions(
        defaultOptions: ReadonlyMap<string, string[]>,
        request: RoomCreationOptions,
    ): Map<string, string[]> {
        const options = new Map(defaultOptions);
        options
            .set('muc#roomconfig_whois', [request.nonAnonymous ? 'anyone' : 'moderators'])
            .set('muc#roomconfig_publicroom', [request.public ? '1' : '0'])
            .set('muc#roomconfig_membersonly', [request.membersOnly ? '1' : '0'])
            .set('muc#roomconfig_persistentroom', [request.persistentRoom ? '1' : '0']);

        if (request.allowSubscription !== undefined) {
            options.set('allow_subscription', [request.allowSubscription === true ? '1' : '0']);
        }

        return options;
    }

    private isRoomMessageStanza(stanza: Stanza): boolean {
        return stanza.name === 'message' && stanza.attrs.type === 'groupchat' && !!stanza.getChildText('body')?.trim();
    }

    private isRoomSubjectStanza(stanza: Stanza): boolean {
        return stanza.name === 'message' && stanza.attrs.type === 'groupchat' && stanza.getChild('subject') != null;
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

    getRoomByJid(jid: JID): Room | undefined {
        return this.rooms$.getValue().find(room => room.roomJid.equals(jid.bare()));
    }

    async banUser(userJid: JID, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
        if (userJid.bare().equals(roomJid)) {
            throw new Error('occupant\'s room JID is not sufficient to ban an occupant, you must provide user\'s bare JID!');
        }
        const response = await this.modifyAffiliationOrRole(roomJid, {
            userJid: userJid.bare(),
            affiliation: Affiliation.outcast,
            reason,
        });

        return Promise.resolve(response);
    }

    async unbanUser(userJid: JID, roomJid: JID): Promise<IqResponseStanza> {
        if (userJid.bare().equals(roomJid)) {
            throw new Error('occupant\'s room JID is not sufficient to unban an occupant, you must provide user\'s bare JID!');
        }

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
            xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
                xml('item', {affiliation: Affiliation.outcast}),
            ),
        );
        const response = await this.xmppChatAdapter.chatConnectionService.sendIq(iq);

        return Promise.resolve(response.getChild('query').getChildren('item').map(item => ({
            userJid: parseJid(item.attrs.jid),
            affiliation: item.attrs.affiliation,
            reason: item.getChild('reason')?.getText(),
        })));
    }

    async inviteUser(inviteeJid: JID, roomJid: JID, invitationMessage?: string) {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        const stanza = xml('message', {to: roomJid.toString(), from},
            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                xml('invite', {to: inviteeJid.toString()},
                    invitationMessage ? xml('reason', {}, invitationMessage) : null,
                ),
            ),
        );
        await this.xmppChatAdapter.chatConnectionService.send(stanza);
    }

    async kickOccupant(nick: string, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
        const response = await this.modifyAffiliationOrRole(roomJid, {nick, role: Role.none, reason});
        this.logService.debug(`kicking occupant response: ${response.toString()}`);
        return response;
    }

    async changeUserNickname(newNick: string, roomJid: JID): Promise<void> {
        const stanza = xml('presence', {
            to: `${roomJid.toString()}/${newNick}`,
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
        this.logService.debug(`left room: ${occupantJid}`);
    }

    async changeRoomSubject(roomJid: JID, subject: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        await this.xmppChatAdapter.chatConnectionService.send(
            xml('message', {to: roomJid.toString(), from, type: 'groupchat'},
                xml('subject', {}, subject),
            ),
        );
        this.logService.debug(`change room '${roomJid}' subject to: ${subject}`);
    }

    private handleRoomSubjectStanza(stanza: Stanza, archiveDelayElement: Stanza): boolean {
        const roomJid = parseJid(stanza.attrs.from).bare();
        const room = this.getRoomByJid(roomJid);

        if (!room) {
            throw new Error(`unknown room ${roomJid.toString()} trying to change room subject`);
        }

        const subject = stanza.getChild('subject').getText().trim();
        if (subject) {
            room.name = subject;
            this.rooms$.next(this.rooms$.getValue());
        }

        return true;
    }

    isRoomInvitationStanza(stanza: Stanza): boolean {
        let x;
        return stanza.name === 'message'
            && !!(x = stanza.getChild('x', MultiUserChatPlugin.MUC_USER))
            && (x.getChild('invite') || x.getChild('decline'));
    }

    private handleRoomInvitationStanza(stanza: Stanza): boolean {
        const xEl = stanza.getChild('x', MultiUserChatPlugin.MUC_USER);
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

    private async setAffiliation(userJid: JID, roomJid: JID, affiliation: Affiliation, reason?: string): Promise<IqResponseStanza> {
        if (userJid.bare().equals(roomJid)) {
            throw new Error('occupant\'s room JID is not sufficient to change affiliation, you must provide user\'s bare JID!');
        }

        return await this.modifyAffiliationOrRole(roomJid, {userJid, affiliation, reason});
    }

    private async setRole(occupantNick: string, roomJid: JID, role: Role, reason?: string): Promise<IqResponseStanza> {
        return await this.modifyAffiliationOrRole(roomJid, {nick: occupantNick, role, reason});
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
}

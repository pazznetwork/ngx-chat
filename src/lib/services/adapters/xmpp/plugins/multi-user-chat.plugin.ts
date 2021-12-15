import { jid as parseJid, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
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

export interface Occupant {
    jid?: string;
    affiliation?: Affiliation;
    nick?: string;
    role?: Role;
}

export interface RoomMetadata {
    [key: string]: any;
}

export class Room {

    readonly recipientType = 'room';
    readonly roomJid: JID;
    occupantJid: JID;
    name: string;
    avatar = dummyAvatarRoom;
    metadata: RoomMetadata = {};
    private messageStore: MessageStore<RoomMessage>;

    get jidBare(): JID {
        return this.roomJid;
    }

    constructor(occupantJid: JID, logService: LogService, name?: string | undefined) {
        this.roomJid = occupantJid.bare();
        this.name = name ?? occupantJid.bare().toString();
        this.occupantJid = occupantJid;
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

    addMessage(message: RoomMessage): void {
        this.messageStore.addMessage(message);
    }

    equalsBareJid(other: Recipient | JID): boolean {
        if (other instanceof Room || isJid(other)) {
            const otherJid = other instanceof Room ? other.roomJid : other.bare();
            return this.roomJid.bare().equals(otherJid);
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

class QueryMemberListStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private readonly roomJid: string, private readonly affiliation: string) {
        super();
    }

    static build(roomJid: string, affiliation: string): Stanza {
        return new QueryMemberListStanzaBuilder(roomJid, affiliation).toStanza();
    }

    toStanza(): Stanza {
        return xml('iq', {type: 'get', to: this.roomJid},
            xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
                xml('item', {affiliation: this.affiliation}),
            ),
        );
    }

}

export interface RoomSummary {
    jid: string;
    name: string;
}

class ModifyMemberListStanzaBuilder extends AbstractStanzaBuilder {

    constructor(
        private readonly roomJid: string,
        private readonly modifications: readonly Occupant[],
        private readonly reason?: string
    ) {
        super();
    }

    static build(roomJid: string, modifications: readonly Occupant[], reason?: string): Stanza {
        return new ModifyMemberListStanzaBuilder(roomJid, modifications, reason).toStanza();
    }

    toStanza(): Stanza {
        return xml('iq', {to: this.roomJid, type: 'set'},
            xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
                ...this.modifications.map(modification => this.buildItem(modification, this.reason)),
            ),
        );
    }

    private buildItem({nick, jid, affiliation, role}: Occupant, reason?: string): Element {
        const item = xml('item', {jid: jid?.toString(), affiliation},
            reason ? xml('reason', {}, reason) : null
        );
        if (nick) {
            item.attrs.nick = nick;
        }
        if (role) {
            item.attrs.role = role;
        }
        return item;
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
    private readonly roomJoinResponseHandlers = new Map<string, (stanza: Stanza) => void>();

    private onOccupantJoinedSubject = new Subject<Occupant>();
    readonly onOccupantJoined$: Observable<Occupant> = this.onOccupantJoinedSubject.asObservable();

    private onOccupantLeftSubject = new Subject<Occupant>();
    readonly onOccupantLeft$: Observable<Occupant> = this.onOccupantLeftSubject.asObservable();

    private onOccupantKickedSubject = new Subject<Occupant>();
    readonly onOccupantKicked$: Observable<Occupant> = this.onOccupantKickedSubject.asObservable();

    private onOccupantBannedSubject = new Subject<Occupant>();
    readonly onOccupantBanned$: Observable<Occupant> = this.onOccupantBannedSubject.asObservable();

    private onOccupantChangedNickSubject = new Subject<{occupant: Occupant, newNick: string}>();
    readonly onOccupantChangedNick$: Observable<{occupant: Occupant, newNick: string}> = this.onOccupantChangedNickSubject.asObservable();

    constructor(
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly logService: LogService,
        private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
    ) {
        super();
    }

    onOffline(): void {
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
        } else if (this.isRoomInviteStanza(stanza)) {
            return this.handleRoomInviteStanza(stanza);
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
        const handleStanza = this.roomJoinResponseHandlers.get(stanza.attrs.from);
        const stanzaType = stanza.attrs.type;

        if (stanzaType === 'error') {
            this.handlerErrorMessage(stanza);
        }

        if (handleStanza) {
            this.roomJoinResponseHandlers.delete(stanza.attrs.from);
            handleStanza(stanza);
        }

        const roomJid = parseJid(stanza.attrs.from.split('/')[0]);

        const x = stanza.getChild('x', MultiUserChatPlugin.MUC_USER);

        const occupant: Occupant = {
            jid: x.getChild('item').attrs.jid,
            affiliation: x.getChild('item').attrs.affiliation,
            role: x.getChild('item').attrs.role,
            nick: stanza.attrs.from.split('/')[1],
        };

        if (stanzaType === 'unavailable') {
            const statusCodes = x.getChildren('status').map(status => status.attrs.code);

            if (statusCodes.includes('307') && occupant.affiliation === Affiliation.none) {
                const actor = x.getChild('item').getChild('actor')?.attrs.nick;
                const reason = x.getChild('item').getChild('reason')?.getText();

                return this.handleOccupantKicked(occupant, roomJid.toString(), statusCodes.includes('110'), actor, reason);
            } else if (statusCodes.includes('301') && occupant.affiliation === Affiliation.outcast) {
                return this.handleOccupantBanned(occupant);
            } else if (statusCodes.includes('303')) {
                return this.handleOccupantChangedNick(occupant, x.getChild('item').attrs.nick);
            } else {
                return this.handleOccupantLeft(occupant, roomJid.toString(), statusCodes.includes('110'));
            }
        } else if (!stanzaType) {
            const room = this.getOrCreateRoom(roomJid);
            return this.handleOccupantJoined(occupant, room.roomJid.toString());
        }
        return false;
    }

    private handleOccupantJoined(occupant: Occupant, roomJid: string): boolean {
        this.logService.debug(`user '${occupant}' joined room '${roomJid}'`);
        this.onOccupantJoinedSubject.next(occupant);
        return true;
    }

    private handleOccupantLeft(occupant: Occupant, roomJid: string, isCurrentUser: boolean): boolean {
        if (isCurrentUser) {
            this.rooms$.next(this.rooms$.getValue().filter(r => r.jidBare.toString() !== roomJid));
        }
        this.logService.debug(`user ${occupant} left room '${roomJid}'`);
        this.onOccupantLeftSubject.next(occupant);
        return true;
    }

    private handleOccupantKicked(occupant: Occupant, roomJid: string, isCurrentUser: boolean, actor?: string, reason?: string): boolean {
        this.onOccupantKickedSubject.next(occupant);
        this.logService.debug(`user got kicked: ${JSON.stringify(occupant)}`);
        if (isCurrentUser) {
            this.logService.info(`you got kicked by: ${actor}, with reason: ${reason}`);
            this.rooms$.next(this.rooms$.getValue().filter(r => r.jidBare.toString() !== roomJid.toString()));
        }
        return true;
    }

    private handleOccupantBanned(occupant: Occupant): boolean {
        this.logService.debug(`user got banned: ${JSON.stringify(occupant)}`);
        this.onOccupantBannedSubject.next(occupant);
        return true;
    }

    private handleOccupantChangedNick(occupant: Occupant, newNick: string): boolean {
        this.logService.debug(`user changed nick from ${occupant.nick} to ${newNick}`);
        this.onOccupantChangedNickSubject.next({occupant, newNick});
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

    private getOrCreateRoom(roomJid: JID, name?: string): Room {
        let room = this.getRoomByJid(roomJid);
        if (!room) {
            room = new Room(roomJid, this.logService, name);
            this.rooms$.next([room].concat(this.rooms$.getValue()));
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
        const roomJoinedPromise = new Promise<Stanza>(
            resolve => this.roomJoinResponseHandlers.set(occupantJid.toString(), resolve),
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
            throw e;
        }

        const presenceResponse = await roomJoinedPromise;
        if (presenceResponse.getChild('error')) {
            throw new Error('error joining room: ' + presenceResponse.toString());
        }

        let room = this.getRoomByJid(roomJid);
        if (!room) {
            room = new Room(occupantJid, this.logService, name);
            this.rooms$.next([room].concat(this.rooms$.getValue()));
        }

        return {presenceResponse, room};
    }

    async joinRoom(roomJid: JID): Promise<Room> {
        return (await this.joinRoomInternal(roomJid)).room;
    }

    async queryAllRooms(): Promise<RoomSummary[]> {
        const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');
        const to = conferenceServer.jid.toString();

        const result = [];

        let roomQueryResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: conferenceServer.jid.toString()},
                xml('query', {xmlns: ServiceDiscoveryPlugin.DISCO_ITEMS}),
            ),
        );
        result.push(...this.extractRoomSummariesFromResponse(roomQueryResponse));

        let resultSet = this.extractResultSetFromResponse(roomQueryResponse);
        while (resultSet && resultSet.getChild('last')) {
            const lastReceivedRoom = resultSet.getChildText('last');
            roomQueryResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'get', to: conferenceServer.jid.toString()},
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
        const roomSummaries = iq
            .getChild('query', ServiceDiscoveryPlugin.DISCO_ITEMS)
            ?.getChildren('item')
            ?.map(room => room.attrs);
        return this.isRoomSummaryArray(roomSummaries) ? roomSummaries : [];
    }

    private isRoomSummaryArray(elements: { [attrName: string]: any; }[]): elements is RoomSummary[] {
        return elements.every(element => {
            const keys = Object.keys(element);
            return keys.length === 2 && keys.includes('jid') && keys.includes('name');
        });
    }

    private extractResultSetFromResponse(iq: IqResponseStanza): Stanza {
        return iq
            .getChild('query', ServiceDiscoveryPlugin.DISCO_ITEMS)
            ?.getChild('set', 'http://jabber.org/protocol/rsm');
    }

    /**
     * Get all members of a MUC-Room with their affiliation to the room using the rooms fullJid
     * @param fullRoomJid fullJid of the room as string
     */
    async queryMemberList(fullRoomJid: string): Promise<Occupant[]> {
        const memberQueryResponses = await Promise.all([
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(fullRoomJid, 'admin')),
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(fullRoomJid, 'member')),
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(fullRoomJid, 'owner')),
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(fullRoomJid, 'outcast')),
        ]);
        let members: Occupant[] = [];
        for (const memberQueryResponse of memberQueryResponses) {
            const membersFromQueryResponse = memberQueryResponse.getChild('query').getChildren('item')
                .map((memberItem: Element) => ({
                    jid: memberItem.attrs.jid,
                    nick: memberItem.attrs.nick,
                    affiliation: memberItem.attrs.affiliation,
                }));
            members = members.concat(membersFromQueryResponse);
        }

        return members;
    }

    async modifyMemberList(roomJid: string, occupant: Occupant, reason?: string): Promise<IqResponseStanza> {
        return await this.xmppChatAdapter.chatConnectionService.sendIq(
            ModifyMemberListStanzaBuilder.build(roomJid, [occupant], reason),
        );
    }

    async sendMessage(room: Room, body: string, thread?: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        const roomJid = room.roomJid.toString();
        const roomMessageStanza = thread ? StanzaBuilder.buildRoomMessageWithThread(from, roomJid, body, thread)
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
        return stanza.name === 'message' && stanza.attrs.type === 'groupchat' && !!stanza.getChildText('subject')?.trim();
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
        return this.rooms$.getValue().find(room => room.roomJid.equals(jid));
    }

    async banOccupant(occupantJid: string, roomJid: string, reason?: string): Promise<IqResponseStanza> {
        const response = await this.modifyMemberList(roomJid, {
            jid: occupantJid,
            affiliation: Affiliation.outcast
        }, reason);

        if (response.attrs.type === 'error') {
            throw new Error(`error banning user: ${response.toString()}`);
        }
        return Promise.resolve(response);
    }

    async unbanOccupant(occupantJid: string, roomJid: string): Promise<IqResponseStanza> {
        const banList = await this.getBanList(roomJid);
        this.logService.debug(`ban list: ${JSON.stringify(banList)}`);

        if (!banList.includes(occupantJid)) {
            throw new Error(`error unbanning: ${occupantJid} isn't on the ban list`);
        }

        const response = await this.modifyMemberList(roomJid, {jid: occupantJid, affiliation: Affiliation.none});
        this.logService.debug('unban response: ' + response);

        if (response.attrs.type === 'error') {
            throw new Error(`error unbanning user: ${response.toString()}`);
        }

        return Promise.resolve(response);
    }

    async getBanList(roomJid): Promise<string[]> {
        const iq = xml('iq', {to: roomJid, type: 'get'},
            xml('query', {xmlns: MultiUserChatPlugin.MUC_ADMIN},
                xml('item', {affiliation: Affiliation.outcast})
            )
        );
        const response = await this.xmppChatAdapter.chatConnectionService.sendIq(iq);

        return Promise.resolve(response.getChild('query').children.map(item => {
            return item.attrs.jid;
        }));
    }

    async inviteUser(jid: string, roomJid: string, reason?: string) {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        const stanza = xml('message', {to: roomJid, from},
            xml('x', {xmlns: MultiUserChatPlugin.MUC_USER},
                xml('invite', {to: jid},
                    reason ? xml('reason', {}, reason) : null,
                )
            )
        );
        await this.xmppChatAdapter.chatConnectionService.send(stanza);
    }

    async kickOccupant(nick: string, roomJid: string, reason?: string): Promise<IqResponseStanza> {
        const response = await this.modifyMemberList(roomJid, {
            nick,
            role: Role.none
        }, reason);
        this.logService.debug(`kicking member response: ${response.toString()}`);
        if (response.attrs.type === 'error') {
            throw new Error('error kicking member' + response.toString());
        }
        return Promise.resolve(response);
    }

    async changeUserNickname(newNick: string, roomJid: string): Promise<void> {
        const stanza = xml('presence', {
            to: `${roomJid}/${newNick}`,
            from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
        });
        await this.xmppChatAdapter.chatConnectionService.send(stanza);
        return Promise.resolve();
    }

    async leaveRoom(roomJid: string) {
        const stanza = xml('presence', {
                to: roomJid,
                from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
                type: Presence[Presence.unavailable]
            },
            xml('status', {})
        );

        await this.xmppChatAdapter.chatConnectionService.send(stanza);
        this.logService.debug(`left room: ${roomJid}`);
    }

    async changeRoomTopic(roomJid: string, subject: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid.toString();
        await this.xmppChatAdapter.chatConnectionService.send(
            xml('message', {to: roomJid, from, type: 'groupchat'},
                xml('subject', {}, subject)
            )
        );
        this.logService.debug(`change room '${roomJid}' subject to: ${subject}`);
        return Promise.resolve();
    }

    private handleRoomSubjectStanza(stanza: Stanza, archiveDelayElement: Stanza) {
        const roomJid = stanza.attrs.from.split('/')[0];
        const room = this.getRoomByJid(parseJid(roomJid));

        if (!room) {
            throw new Error(`unknown room ${room.jidBare.toString()} trying to change room subject`);
        }
        const rooms = this.rooms$.getValue();
        rooms.find((r) => r.roomJid.toString() === roomJid).name = stanza.getChild('subject').getText();
        this.rooms$.next(rooms);

        return true;
    }

    private isRoomInviteStanza(stanza: Stanza) {
        let x;
        return stanza.name === 'message'
            && !!(x = stanza.getChild('x', MultiUserChatPlugin.MUC_USER))
            && (x.getChild('invite') || x.getChild('decline'));
    }

    private handleRoomInviteStanza(stanza: Stanza) {
        const roomJid = stanza.attrs.from;
        const from = stanza.getChild('x', MultiUserChatPlugin.MUC_USER).getChild('invite').attrs.from;
        // todo do something with invitation
        return true;
    }

    private async setAffiliation(occupantJid: string, roomJid: string, affiliation: Affiliation, reason?: string):
        Promise<IqResponseStanza> {
        const response = await this.modifyMemberList(roomJid, {jid: occupantJid, affiliation}, reason);
        if (response.attrs.type === 'error') {
            throw new Error(`error granting affiliation ${affiliation} to ${occupantJid}`);
        }
        return Promise.resolve(response);
    }

    private async setRole(occupantNick: string, roomJid: string, role: Role, reason?: string): Promise<IqResponseStanza> {
        const response = await this.modifyMemberList(roomJid, {
            jid: null,
            affiliation: null,
            nick: occupantNick,
            role
        }, reason);
        if (response.attrs.type === 'error') {
            throw new Error(`error granting role ${role} to '${occupantNick}'`);
        }
        return Promise.resolve(response);
    }

    async grantMembership(occupantJid: string, roomJid: string, reason?: string) {
        await this.setAffiliation(occupantJid, roomJid, Affiliation.member, reason);
    }

    async revokeMembership(occupantJid: string, roomJid: string, reason?: string) {
        await this.setAffiliation(occupantJid, roomJid, Affiliation.none, reason);
    }

    async grantAdmin(occupantJid: string, roomJid: string, reason?: string) {
        await this.setAffiliation(occupantJid, roomJid, Affiliation.admin, reason);
    }

    async revokeAdmin(occupantJid: string, roomJid: string, reason?: string) {
        await this.setAffiliation(occupantJid, roomJid, Affiliation.member, reason);
    }

    async grantModeratorStatus(occupantNick: string, roomJid: string, reason?: string) {
        await this.setRole(occupantNick, roomJid, Role.moderator, reason);
    }

    async revokeModeratorStatus(occupantNick: string, roomJid: string, reason?: string) {
        await this.setRole(occupantNick, roomJid, Role.participant, reason);
    }
}

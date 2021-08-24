import { jid as parseJid, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { ContactMetadata } from '../../../../core/contact';
import { dummyAvatarRoom } from '../../../../core/contact-avatar';
import { Direction, Message } from '../../../../core/message';
import { DateMessagesGroup, MessageStore } from '../../../../core/message-store';
import { isJid, Recipient } from '../../../../core/recipient';
import { IqResponseStanza, Stanza } from '../../../../core/stanza';
import { LogService } from '../../../log.service';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { MessageReceivedEvent } from './message.plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

export interface RoomCreationOptions {
    name?: string;
    roomId: string;
    public: boolean;
    membersOnly: boolean;
    nonAnonymous: boolean;
    persistentRoom: boolean;
    nick?: string;
    /** ejabberd MucSub */
    allowSubscription?: boolean;
}

export interface RoomMessage extends Message {
    from: JID;
}

export interface Occupant {
    roomJid: JID;
    realJid?: JID;
    metadata: ContactMetadata;
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

class RoomMessageStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private readonly roomJid: string,
                private readonly from: string,
                private readonly body: string,
                private readonly thread?: string) {
        super();
    }

    toStanza(): Stanza {
        const messageStanza = xml('message', {from: this.from, to: this.roomJid, type: 'groupchat'},
            xml('body', {}, this.body),
        );
        if (this.thread) {
            messageStanza.children.push(
                xml('thread', {}, this.thread),
            );
        }
        return messageStanza;
    }

}

export enum Affiliation {
    none,
    member,
    admin,
    owner,
    outcast
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
            xml('query', {xmlns: 'http://jabber.org/protocol/muc#admin'},
                xml('item', {affiliation: this.affiliation}),
            ),
        );
    }

}

export interface MemberlistItem {
    jid: string;
    affiliation: Affiliation;
    nick?: string;
}

export interface RoomSummary {
    jid: string;
    name: string;
}

class ModifyMemberListStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private readonly roomJid: string, private readonly modifications: readonly MemberlistItem[]) {
        super();
    }

    static build(roomJid: string, modifications: readonly MemberlistItem[]): Stanza {
        return new ModifyMemberListStanzaBuilder(roomJid, modifications).toStanza();
    }

    toStanza(): Stanza {
        return xml('iq', {to: this.roomJid, type: 'set'},
            xml('query', {xmlns: 'http://jabber.org/protocol/muc#admin'},
                ...this.modifications.map(modification => this.buildItem(modification)),
            ),
        );
    }

    private buildItem(modification: MemberlistItem): Element {
        const item = xml('item', {jid: modification.jid, affiliation: Affiliation[modification.affiliation]});
        if (modification.nick) {
            item.attrs.nick = modification.nick;
        }
        return item;
    }
}

/**
 * @see https://xmpp.org/extensions/xep-0045.html
 */
export class MultiUserChatPlugin extends AbstractXmppPlugin {

    readonly rooms$ = new BehaviorSubject<Room[]>([]);
    readonly message$ = new Subject<Room>();
    private readonly roomJoinResponseHandlers = new Map<string, (stanza: Stanza) => void>();

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
        }
        return false;
    }

    private isRoomPresenceStanza(stanza: Stanza): boolean {
        return stanza.name === 'presence' && (
            stanza.getChild('x', 'http://jabber.org/protocol/muc')
            || stanza.getChild('x', 'http://jabber.org/protocol/muc#user')
        ) != null;
    }

    private handleRoomPresenceStanza(stanza: Stanza): boolean {
        const handleStanza = this.roomJoinResponseHandlers.get(stanza.attrs.from);
        if (handleStanza) {
            this.roomJoinResponseHandlers.delete(stanza.attrs.from);
            handleStanza(stanza);
            return true;
        }
        return false;
    }

    /**
     * Resolves if room could be configured as requested, rejects if room did exist or server did not accept configuration.
     */
    async createRoom(request: RoomCreationOptions): Promise<Room> {
        const roomId = request.roomId;
        const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');
        const occupantJid = parseJid(roomId, service.jid, request.nick);
        const {presenceResponse, room} = await this.joinRoomInternal(occupantJid, request.name);

        const itemElement = presenceResponse.getChild('x').getChild('item');
        if (itemElement.attrs.affiliation !== 'owner') {
            throw new Error('error creating room, user is not owner: ' + presenceResponse.toString());
        }

        const configurationForm = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: room.roomJid.toString()},
                xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'}),
            ),
        );

        const configurationListElement = configurationForm.getChild('query').getChild('x');
        if (!configurationListElement) {
            throw new Error('room not configurable');
        }

        const roomConfigurationOptions =
            this.applyRoomCreationRequestOptions(
                this.extractDefaultConfiguration(configurationListElement.getChildren('field')),
                request
            );

        try {
            await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'set', to: room.roomJid.toString()},
                    xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                        xml('x', {xmlns: 'jabber:x:data', type: 'submit'},
                            xml('field', {var: 'FORM_TYPE'},
                                xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig'),
                            ),
                            ...this.configurationToElements(roomConfigurationOptions),
                        ),
                    ),
                ),
            );
            return room;
        } catch (e: unknown) {
            this.logService.error('room configuration rejected', e);
            throw e;
        }
    }

    async destroyRoom(roomJid: JID): Promise<IqResponseStanza<'result'>> {
        let roomDestroyedResponse: IqResponseStanza<'result'>;
        try {
            roomDestroyedResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'set', to: roomJid.toString()},
                    xml('query', {xmlns: 'http://jabber.org/protocol/muc#owner'},
                        xml('destroy'))));
        } catch (e: unknown) {
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
            resolve => this.roomJoinResponseHandlers.set(occupantJid.toString(), resolve)
        );

        try {
            await this.xmppChatAdapter.chatConnectionService.send(
                xml('presence', {from: userJid.toString(), to: occupantJid.toString()},
                    xml('x', {xmlns: 'http://jabber.org/protocol/muc'}),
                ),
            );
        } catch (e: unknown) {
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

    async joinRoom(occupantJid: JID): Promise<Room> {
        return (await this.joinRoomInternal(occupantJid)).room;
    }

    async queryAllRooms(): Promise<RoomSummary[]> {
        const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');

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
        return iq
            .getChild('query', ServiceDiscoveryPlugin.DISCO_ITEMS)
            ?.getChildren('item')
            ?.map(room => room.attrs) || [];
    }

    private extractResultSetFromResponse(iq: IqResponseStanza): Stanza {
        return iq
            .getChild('query', ServiceDiscoveryPlugin.DISCO_ITEMS)
            ?.getChild('set', 'http://jabber.org/protocol/rsm');
    }

    async queryMemberList(room: Room): Promise<MemberlistItem[]> {
        const memberQueryResponses = await Promise.all([
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(room.roomJid.toString(), 'admin')),
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(room.roomJid.toString(), 'member')),
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(room.roomJid.toString(), 'owner')),
            this.xmppChatAdapter.chatConnectionService.sendIq(QueryMemberListStanzaBuilder.build(room.roomJid.toString(), 'outcast')),
        ]);
        let members: MemberlistItem[] = [];
        for (const memberQueryResponse of memberQueryResponses) {
            const membersFromQueryResponse = memberQueryResponse.getChild('query').getChildren('item')
                .map((memberItem: Element) => ({
                    jid: memberItem.attrs.jid,
                    nick: memberItem.attrs.nick,
                    affiliation: this.reverseMapAffiliation(memberItem.attrs.affiliation),
                }));
            members = members.concat(membersFromQueryResponse);
        }

        return members;
    }

    private reverseMapAffiliation(value: string): Affiliation {
        if (!value || value === 'none') {
            return Affiliation.none;
        } else if (value === 'member') {
            return Affiliation.member;
        } else if (value === 'admin') {
            return Affiliation.admin;
        } else if (value === 'owner') {
            return Affiliation.owner;
        } else if (value === 'outcast') {
            return Affiliation.outcast;
        } else {
            const message = 'unexpected affilation: ' + value;
            this.logService.error(message);
            throw new Error(message);
        }
    }

    async modifyMemberList(roomJid: string, jid: string, affiliation: Affiliation, nick?: string): Promise<IqResponseStanza> {
        return await this.xmppChatAdapter.chatConnectionService.sendIq(
            ModifyMemberListStanzaBuilder.build(roomJid, [{jid, affiliation, nick}]),
        );
    }

    async sendMessage(room: Room, body: string, thread?: string): Promise<void> {
        const from = this.xmppChatAdapter.chatConnectionService.userJid;
        const roomMessageStanza = new RoomMessageStanzaBuilder(room.roomJid.toString(), from.toString(), body, thread)
            .toStanza();

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
                field.getChildren('value').map(value => value.getText())
            ] as const));

        return new Map(entries);
    }

    private applyRoomCreationRequestOptions(
        defaultOptions: ReadonlyMap<string, string[]>,
        request: RoomCreationOptions
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
            fromArchive: archiveDelayElement != null
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

    getRoomByJid(jid: JID): Room | null {
        for (const room of this.rooms$.getValue()) {
            if (room.roomJid.equals(jid)) {
                return room;
            }
        }

        return null;
    }

}

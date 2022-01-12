import { JID } from '@xmpp/jid';
import { dummyAvatarRoom } from '../../../../../core/contact-avatar';
import { DateMessagesGroup, MessageStore } from '../../../../../core/message-store';
import { LogService } from '../../../../log.service';
import { ReplaySubject, Subject } from 'rxjs';
import { jid as parseJid } from '@xmpp/client';
import { isJid, Recipient } from '../../../../../core/recipient';
import { RoomMetadata} from './multi-user-chat.plugin';
import { RoomOccupant } from './room.occupant';
import { RoomMessage } from './room.message';
import { OccupantChange } from './occupant.change';

export class Room {

    readonly recipientType = 'room';
    readonly roomJid: JID;
    occupantJid: JID | undefined;
    name: string;
    avatar = dummyAvatarRoom;
    metadata: RoomMetadata = {};
    private messageStore: MessageStore<RoomMessage>;
    private logService: LogService;
    private roomOccupants = new Map<string, RoomOccupant>();

    private onOccupantChangedSubject = new Subject<OccupantChange>();
    readonly onOccupantChanged$ = this.onOccupantChangedSubject.asObservable();

    private occupantsSubject = new ReplaySubject<RoomOccupant[]>(1);
    readonly occupants$ = this.occupantsSubject.asObservable();

    get jidBare(): JID {
        return this.roomJid;
    }

    constructor(roomJid: JID, logService: LogService, nick?: string, name?: string) {
        this.roomJid = roomJid.bare();
        this.name = name ?? this.roomJid.toString();
        this.logService = logService;
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

    handleOccupantLeft(occupant: RoomOccupant, isCurrenUser: boolean) {
        this.removeOccupant(occupant);
        if (isCurrenUser) {
            this.roomOccupants.clear();
            this.occupantsSubject.next(Array.from(this.roomOccupants.values()));
        }
        this.logService.debug(`user ${occupant.occupantJid.toString()} left room '${this.roomJid.toString()}'`);
        this.onOccupantChangedSubject.next({occupant, change: 'left'});
        return true;
    }

    handleOccupantJoined(occupant: RoomOccupant) {
        this.addOccupant(occupant);

        this.onOccupantChangedSubject.next({occupant, change: 'joined'});
        this.logService.debug(`user '${occupant}' joined room '${this.roomJid.toString()}'`);
        return true;
    }

    handleOccupantKicked(occupant: RoomOccupant, isCurrentUser: boolean, actor?: string, reason?: string) {
        this.removeOccupant(occupant);
        if (isCurrentUser) {
            this.roomOccupants.clear();
            this.occupantsSubject.next(Array.from(this.roomOccupants.values()));
            this.logService.info(`you got kicked from room! room jid: ${this.roomJid.toString()}, by: ${actor}, with reason: ${reason}`);
        }
        this.logService.debug(`user got kicked: ${JSON.stringify(occupant)}`);
        this.onOccupantChangedSubject.next({occupant, change: 'kicked'});
        return true;
    }

    handleOccupantBanned(occupant: RoomOccupant, isCurrentUser: boolean, actor: string, reason: string) {
        this.removeOccupant(occupant);
        if (isCurrentUser) {
            this.roomOccupants.clear();
            this.occupantsSubject.next(Array.from(this.roomOccupants.values()));
            this.logService.info(`you got banned from room! room jid: ${this.roomJid.toString()}, by: ${actor}, with reason: ${reason}`);
        }
        this.logService.debug(`user got banned: ${JSON.stringify(occupant)}`);
        this.onOccupantChangedSubject.next({occupant, change: 'banned'});
        return true;
    }

    handleOccupantChangedNick(occupant: RoomOccupant, isCurrentUser: boolean, newNick: string) {
        if (isCurrentUser) {
            this.setNick(newNick);
        }
        let existingOccupant = this.roomOccupants.get(occupant.occupantJid.toString());
        if (!existingOccupant) {
            existingOccupant = {...occupant};
            existingOccupant.occupantJid = parseJid(occupant.occupantJid.toString());
        }
        existingOccupant.occupantJid.resource = newNick;
        existingOccupant.nick = newNick;
        this.roomOccupants.delete(occupant.occupantJid.toString());
        this.roomOccupants.set(existingOccupant.occupantJid.toString(), existingOccupant);

        this.logService.debug(`user changed nick from ${occupant.nick} to ${newNick}`);
        this.onOccupantChangedSubject.next({occupant, newNick, change: 'changedNick'});
        return true;
    }

    private addOccupant(occupant: RoomOccupant) {
        this.roomOccupants.set(occupant.occupantJid.toString(), occupant);
        this.occupantsSubject.next([...this.roomOccupants.values()]);
    }

    private removeOccupant(occupant: RoomOccupant) {
        if (this.roomOccupants.delete(occupant.occupantJid.toString())) {
            this.occupantsSubject.next(Array.from(this.roomOccupants.values()));
        }
    }

}

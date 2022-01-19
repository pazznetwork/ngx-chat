import { JID } from '@xmpp/jid';
import { ReplaySubject, Subject } from 'rxjs';
import { dummyAvatarRoom } from '../../../../../core/contact-avatar';
import { DateMessagesGroup, MessageStore } from '../../../../../core/message-store';
import { LogService } from '../../../../log.service';
import { jid as parseJid } from '@xmpp/client';
import { isJid, Recipient } from '../../../../../core/recipient';
import { RoomMetadata } from './multi-user-chat.plugin';
import { RoomOccupant } from './room-occupant';
import { RoomMessage } from './room-message';
import { OccupantChange, OccupantModified } from './occupant-change';

export class Room {

    readonly recipientType = 'room';
    readonly roomJid: JID;
    occupantJid: JID | undefined;
    description = '';
    subject = '';
    avatar = dummyAvatarRoom;
    metadata: RoomMetadata = {};
    private messageStore: MessageStore<RoomMessage>;
    private logService: LogService;
    private roomOccupants = new Map<string, RoomOccupant>();
    private onOccupantChangeSubject = new ReplaySubject<OccupantChange>(Infinity, 1000);
    readonly onOccupantChange$ = this.onOccupantChangeSubject.asObservable();
    private occupantsSubject = new ReplaySubject<RoomOccupant[]>(1);
    readonly occupants$ = this.occupantsSubject.asObservable();
    private onOccupantModifiedSubject = new Subject<OccupantModified>();
    readonly onOccupantModified$ = this.onOccupantModifiedSubject.asObservable();

    constructor(roomJid: JID, logService: LogService) {
        this.roomJid = roomJid.bare();
        this.name = undefined;
        this.logService = logService;
        this.messageStore = new MessageStore<RoomMessage>(logService);
    }

    get nick(): string | undefined {
        return this.occupantJid?.resource;
    }

    set nick(nick: string) {
        const occupantJid = parseJid(this.roomJid.toString());
        occupantJid.resource = nick;
        this.occupantJid = occupantJid;
    }

    // tslint:disable-next-line:variable-name
    private _name: string;

    get name(): string {
        return this._name;
    }

    set name(name: string | undefined) {
        this._name = !!name ? name : this.roomJid.local;
    }

    get jidBare(): JID {
        return this.roomJid;
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
            return this.roomJid.equals(otherJid);
        }
        return false;
    }

    hasOccupant(occupantJid: JID): boolean {
        return this.roomOccupants.has(occupantJid.toString());
    }

    getOccupant(occupantJid: JID): RoomOccupant | undefined {
        return this.roomOccupants.get(occupantJid.toString());
    }

    handleOccupantJoined(occupant: RoomOccupant, isCurrentUser: boolean) {
        this.addOccupant(occupant);

        this.onOccupantChangeSubject.next({change: 'joined', occupant, isCurrentUser});
        this.logService.debug(`occupant joined room: occupantJid=${occupant.occupantJid.toString()}, roomJid=${this.roomJid.toString()}`);
        return true;
    }

    handleOccupantLeft(occupant: RoomOccupant, isCurrentUser: boolean) {
        this.removeOccupant(occupant, isCurrentUser);
        this.logService.debug(`occupant left room: occupantJid=${occupant.occupantJid.toString()}, roomJid=${this.roomJid.toString()}`);
        this.onOccupantChangeSubject.next({change: 'left', occupant, isCurrentUser});
        return true;
    }

    handleOccupantConnectionError(occupant: RoomOccupant, isCurrentUser: boolean) {
        this.removeOccupant(occupant, isCurrentUser);
        this.logService.debug(`occupant left room due to connection error: occupantJid=${occupant.occupantJid.toString()}, roomJid=${this.roomJid.toString()}`);
        this.onOccupantChangeSubject.next({change: 'leftOnConnectionError', occupant, isCurrentUser});
        return true;
    }

    handleOccupantKicked(occupant: RoomOccupant, isCurrentUser: boolean, actor?: string, reason?: string) {
        this.removeOccupant(occupant, isCurrentUser);
        if (isCurrentUser) {
            this.logService.info(`you got kicked from room! roomJid=${this.roomJid.toString()}, by=${actor}, reason=${reason}`);
        }
        this.logService.debug(`occupant got kicked: occupantJid=${occupant.occupantJid.toString()}, roomJid=${this.roomJid.toString()}`);
        this.onOccupantChangeSubject.next({change: 'kicked', occupant, isCurrentUser, actor, reason});
        return true;
    }

    handleOccupantBanned(occupant: RoomOccupant, isCurrentUser: boolean, actor?: string, reason?: string) {
        this.removeOccupant(occupant, isCurrentUser);
        if (isCurrentUser) {
            this.logService.info(`you got banned from room! roomJid=${this.roomJid.toString()}, by=${actor}, reason=${reason}`);
        }
        this.logService.debug(`occupant got banned: occupantJid=${occupant.occupantJid.toString()}, roomJid=${this.roomJid.toString()}`);
        this.onOccupantChangeSubject.next({change: 'banned', occupant, isCurrentUser, actor, reason});
        return true;
    }

    handleOccupantLostMembership(occupant: RoomOccupant, isCurrentUser: boolean) {
        this.removeOccupant(occupant, isCurrentUser);
        if (isCurrentUser) {
            this.logService.info(`your membership got revoked and you got kicked from member-only room: ${this.roomJid.toString()}`);
        }
        this.onOccupantChangeSubject.next({change: 'lostMembership', occupant, isCurrentUser});
        return true;
    }

    handleOccupantChangedNick(occupant: RoomOccupant, isCurrentUser: boolean, newNick: string) {
        if (isCurrentUser) {
            this.nick = newNick;
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

        this.logService.debug(`occupant changed nick: from=${occupant.nick}, to=${newNick}, occupantJid=${occupant.occupantJid.toString()}, roomJid=${this.roomJid.toString()}`);
        this.onOccupantChangeSubject.next({change: 'changedNick', occupant, newNick, isCurrentUser});
        return true;
    }

    handleOccupantModified(occupant: RoomOccupant, oldOccupant: RoomOccupant, isCurrentUser: boolean) {
        this.logService.debug(`occupant changed: from=${JSON.stringify(oldOccupant)}, to=${JSON.stringify(occupant)}`);
        this.onOccupantModifiedSubject.next({occupant, oldOccupant, isCurrentUser});
        return true;
    }

    private addOccupant(occupant: RoomOccupant) {
        this.roomOccupants.set(occupant.occupantJid.toString(), occupant);
        this.occupantsSubject.next([...this.roomOccupants.values()]);
    }

    private removeOccupant(occupant: RoomOccupant, isCurrentUser: boolean) {
        if (isCurrentUser) {
            this.roomOccupants.clear();
            this.occupantsSubject.next([]);
        } else {
            if (this.roomOccupants.delete(occupant.occupantJid.toString())) {
                this.occupantsSubject.next([...this.roomOccupants.values()]);
            }
        }
    }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { ReplaySubject } from 'rxjs';
import { MessageStore } from './message-store';
import { isJid, Recipient } from './recipient';
import type { OccupantChange } from './occupant-change';
import { JID, parseJid } from '../jid';
import type { XmlSchemaForm } from './xml-schema-form';
import type { RoomOccupant } from './room-occupant';
import type { Log } from './log';
import { Invitation } from './invitation';

export class Room implements Recipient {
  readonly recipientType = 'room';
  readonly jid: JID;
  // ??? maybe should have been current user occupant jid
  occupantJid: JID | undefined;
  description = '';
  subject = '';
  avatar = '';
  // Room configuration
  info?: XmlSchemaForm;

  readonly messageStore: MessageStore = new MessageStore();
  private readonly roomOccupants = new Map<string, RoomOccupant>();

  private readonly onOccupantChangeSubject = new ReplaySubject<OccupantChange>(Infinity, 1000);
  readonly onOccupantChange$ = this.onOccupantChangeSubject.asObservable();

  private readonly occupantsSubject = new ReplaySubject<RoomOccupant[]>(1);
  readonly occupants$ = this.occupantsSubject.asObservable();
  private _name?: string;

  private readonly pendingRoomInviteSubject = new ReplaySubject<Invitation | null>(1);
  readonly pendingRoomInvite$ = this.pendingRoomInviteSubject.asObservable();

  get nick(): string | undefined {
    return this.occupantJid?.resource;
  }

  set nick(nick: string | undefined) {
    if (!nick) {
      throw new Error('nick cannot be undefined');
    }
    const occupantJid = parseJid(this.jid.toString());
    this.occupantJid = new JID(occupantJid.local, occupantJid.domain, nick);
  }

  get name(): string | undefined {
    return this._name;
  }

  set name(name: string | undefined) {
    this._name = name != null ? name : this.jid.local;
  }

  constructor(
    private readonly logService: Log,
    roomJid: JID,
    name?: string
  ) {
    this.jid = roomJid.bare();
    this.name = name;
  }

  equalsJid(other: Recipient | JID): boolean {
    if (other instanceof Room || isJid(other)) {
      const otherJid = other instanceof Room ? other.jid : other.bare();
      return this.jid.equals(otherJid);
    }
    return false;
  }

  hasOccupant(occupantJid: JID): boolean {
    return this.roomOccupants.has(occupantJid.toString());
  }

  getOccupant(occupantJid: JID): RoomOccupant | undefined {
    return this.roomOccupants.get(occupantJid.bare().toString());
  }

  findOccupantByNick(nick: string): RoomOccupant | undefined {
    return Array.from(this.roomOccupants.values()).find((occupant) => occupant.jid.local === nick);
  }

  handleOccupantJoined(occupant: RoomOccupant, isCurrentUser: boolean): void {
    this.addOccupant(occupant);

    this.onOccupantChangeSubject.next({ change: 'joined', occupant, isCurrentUser });
    this.logService?.debug(
      `occupant joined room: occupantJid=${occupant.jid.toString()}, roomJid=${this.jid.toString()}`
    );
  }

  handleOccupantLeft(occupant: RoomOccupant, isCurrentUser: boolean): void {
    this.removeOccupant(occupant, isCurrentUser);
    this.logService.debug(
      `occupant left room: occupantJid=${occupant.jid.toString()}, roomJid=${this.jid.toString()}`
    );
    this.onOccupantChangeSubject.next({ change: 'left', occupant, isCurrentUser });
  }

  handleOccupantConnectionError(occupant: RoomOccupant, isCurrentUser: boolean): void {
    this.removeOccupant(occupant, isCurrentUser);
    this.logService.debug(
      `occupant left room due to connection error: occupantJid=${occupant.jid.toString()}, roomJid=${this.jid.toString()}`
    );
    this.onOccupantChangeSubject.next({ change: 'leftOnConnectionError', occupant, isCurrentUser });
  }

  handleOccupantKicked(
    occupant: RoomOccupant,
    isCurrentUser: boolean,
    actor?: string,
    reason?: string
  ): void {
    this.removeOccupant(occupant, isCurrentUser);
    if (isCurrentUser) {
      this.logService.info(
        `you got kicked from room! roomJid=${this.jid.toString()}, by=${actor as string}, reason=${
          reason as string
        }`
      );
    }
    this.logService.debug(
      `occupant got kicked: occupantJid=${occupant.jid.toString()}, roomJid=${this.jid.toString()}`
    );
    this.onOccupantChangeSubject.next({ change: 'kicked', occupant, isCurrentUser, actor, reason });
  }

  handleOccupantBanned(
    occupant: RoomOccupant,
    isCurrentUser: boolean,
    actor?: string,
    reason?: string
  ): void {
    this.removeOccupant(occupant, isCurrentUser);
    if (isCurrentUser) {
      this.logService.info(
        `you got banned from room! roomJid=${this.jid.toString()}, by=${actor as string}, reason=${
          reason as string
        }`
      );
    }
    this.logService.debug(
      `occupant got banned: occupantJid=${occupant.jid.toString()}, roomJid=${this.jid.toString()}`
    );
    this.onOccupantChangeSubject.next({ change: 'banned', occupant, isCurrentUser, actor, reason });
  }

  handleOccupantLostMembership(occupant: RoomOccupant, isCurrentUser: boolean): void {
    this.removeOccupant(occupant, isCurrentUser);
    if (isCurrentUser) {
      this.logService.info(
        `your membership got revoked and you got kicked from member-only room: ${this.jid.toString()}`
      );
    }
    // TODO: we should emit the Status Codes
    this.onOccupantChangeSubject.next({ change: 'lostMembership', occupant, isCurrentUser });
  }

  handleOccupantRoomMembersOnly(occupant: RoomOccupant, isCurrentUser: boolean): void {
    this.removeOccupant(occupant, isCurrentUser);
    if (isCurrentUser) {
      this.logService.info(`you got kicked from member-only room: ${this.jid.toString()}`);
    }
    // TODO: we should emit the Status Codes
    this.onOccupantChangeSubject.next({ change: 'roomMemberOnly', occupant, isCurrentUser });
  }

  handleOccupantChangedNick(occupant: RoomOccupant, isCurrentUser: boolean, newNick: string): void {
    if (isCurrentUser) {
      this.nick = newNick;
    }
    let existingOccupant = this.roomOccupants.get(occupant.jid.bare().toString());
    if (!existingOccupant) {
      existingOccupant = { ...occupant };
      existingOccupant.jid = parseJid(occupant.jid.bare().toString());
    }
    existingOccupant.jid = new JID(
      existingOccupant.jid.local,
      existingOccupant.jid.domain,
      newNick
    );
    existingOccupant.nick = newNick;
    this.roomOccupants.delete(occupant.jid.bare().toString());
    this.roomOccupants.set(existingOccupant.jid.bare().toString(), existingOccupant);

    this.logService.debug(
      `occupant changed nick: from=${
        occupant.nick ?? 'undefined nick'
      }, to=${newNick}, occupantJid=${occupant.jid.toString()}, roomJid=${this.jid.toString()}`
    );
    this.onOccupantChangeSubject.next({ change: 'changedNick', occupant, newNick, isCurrentUser });
  }

  handleOccupantModified(
    occupant: RoomOccupant,
    oldOccupant: RoomOccupant,
    isCurrentUser: boolean
  ): void {
    this.logService.debug(
      `occupant changed: from=${JSON.stringify(oldOccupant)}, to=${JSON.stringify(occupant)}`
    );
    this.onOccupantChangeSubject.next({ change: 'modified', occupant, oldOccupant, isCurrentUser });
  }

  equals(other: Room | null | undefined): boolean {
    if (this === other) {
      return true;
    }

    if (other == null) {
      return false;
    }

    return this.jid.equals(other.jid);
  }

  private addOccupant(occupant: RoomOccupant): void {
    this.roomOccupants.set(occupant.jid.bare().toString(), occupant);
    this.occupantsSubject.next([...this.roomOccupants.values()]);
  }

  private removeOccupant(occupant: RoomOccupant, isCurrentUser: boolean): void {
    if (isCurrentUser) {
      this.roomOccupants.clear();
      this.occupantsSubject.next([]);
    } else {
      if (this.roomOccupants.delete(occupant.jid.bare().toString())) {
        this.occupantsSubject.next([...this.roomOccupants.values()]);
      }
    }
  }

  addOccupants(users: RoomOccupant[]): void {
    users.forEach((user) => this.addOccupant(user));
  }

  clearRoomInvitation(): void {
    this.pendingRoomInviteSubject.next(null);
  }

  newRoomInvitation(invitation: Invitation): void {
    this.pendingRoomInviteSubject.next(invitation);
  }
}

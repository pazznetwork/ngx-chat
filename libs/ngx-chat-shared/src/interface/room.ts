// SPDX-License-Identifier: AGPL-3.0-or-later
import { ReplaySubject } from 'rxjs';
import { MessageStore } from './message-store';
import { isJid, Recipient } from './recipient';
import type { OccupantChange } from './occupant-change';
import { JID, parseJid } from '../jid';
import type { XmlSchemaForm } from './xml-schema-form';
import type { RoomOccupant } from './room-occupant';
import type { Log } from './log';

// noinspection SpellCheckingInspection
export const dummyAvatarRoom =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDYwMCA2MDAiPgogIDxkZWZzPgogICAgPGNsaXBQYXRoIGlkPSJjbGlwLV8zIj4KICAgICAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiLz4KICAgIDwvY2xpcFBhdGg+CiAgPC9kZWZzPgogIDxnIGlkPSJfMyIgZGF0YS1uYW1lPSIzIiBjbGlwLXBhdGg9InVybCgjY2xpcC1fMykiPgogICAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNmZmYiLz4KICAgIDxnIGlkPSJHcnVwcGVfNzcxOCIgZGF0YS1uYW1lPSJHcnVwcGUgNzcxOCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTc4MC42OTcgODgxLjUpIj4KICAgICAgPHJlY3QgaWQ9IlJlY2h0ZWNrXzEzOTgiIGRhdGEtbmFtZT0iUmVjaHRlY2sgMTM5OCIgd2lkdGg9IjYwMCIgaGVpZ2h0PSI1OTkuOTk1IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3ODAuNjk3IC04ODEuNSkiIGZpbGw9IiNlNWU2ZTgiLz4KICAgICAgPGVsbGlwc2UgaWQ9IkVsbGlwc2VfMjg0IiBkYXRhLW5hbWU9IkVsbGlwc2UgMjg0IiBjeD0iMTE2LjIzMSIgY3k9IjEyNS42NzEiIHJ4PSIxMTYuMjMxIiByeT0iMTI1LjY3MSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTY1LjkyNiAtNzY5LjA5MykiIGZpbGw9IiNhZmI0YjgiLz4KICAgICAgPGVsbGlwc2UgaWQ9IkVsbGlwc2VfMjg1IiBkYXRhLW5hbWU9IkVsbGlwc2UgMjg1IiBjeD0iNjcuOTk4IiBjeT0iNzMuNTIxIiByeD0iNjcuOTk4IiByeT0iNzMuNTIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4MTYuMjEgLTY2NS40OTYpIiBmaWxsPSIjYWZiNGI4Ii8+CiAgICAgIDxlbGxpcHNlIGlkPSJFbGxpcHNlXzI4OSIgZGF0YS1uYW1lPSJFbGxpcHNlIDI4OSIgY3g9IjY3Ljk5OCIgY3k9IjczLjUyMSIgcng9IjY3Ljk5OCIgcnk9IjczLjUyMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIxMi4xMDcgLTY2NS40OTYpIiBmaWxsPSIjYWZiNGI4Ii8+CiAgICAgIDxwYXRoIGlkPSJQZmFkXzI0OTYzIiBkYXRhLW5hbWU9IlBmYWQgMjQ5NjMiIGQ9Ik0xMzI3LjA1Mi0yODYuMjI1czAtMjE3LjU2My0yNDQuOTA3LTIxNy41NjNoLTEuNDU3Yy0yNDQuOTA3LDAtMjQ0LjkwNywyMTcuNTYzLTI0NC45MDcsMjE3LjU2M1oiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgNC43MjUpIiBmaWxsPSIjYWZiNGI4Ii8+CiAgICAgIDxwYXRoIGlkPSJQZmFkXzI0OTY0IiBkYXRhLW5hbWU9IlBmYWQgMjQ5NjQiIGQ9Ik05MzMuOTc3LTQ4My44Yy0xLjA1LjYtMi4xLDEuMjItMy4xNCwxLjg0LTMyLjM0LDE5LjM0LTU4LjI5LDQ2LjI3LTc3LjEyLDgwLjA1LTMxLjcsNTYuODgtMzQuMzU1LDExOC43MjgtMzQuMzU1LDEyMS4yNDhoLTQwLjkxTDc4MC43LTQ3MS4zMmMyMy4yOC0xOC44Miw1Ny4wNS0zMi40NywxMDYuMDQtMzIuNDdoLjk0YTIxNy43NTMsMjE3Ljc1MywwLDAsMSw0My44Myw0LjE4QTguNTQ5LDguNTQ5LDAsMCwxLDkzMy45NzctNDgzLjhaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTAgLTAuNzI1KSIgZmlsbD0iI2FmYjRiOCIvPgogICAgICA8cGF0aCBpZD0iUGZhZF8yNDk2OCIgZGF0YS1uYW1lPSJQZmFkIDI0OTY4IiBkPSJNNzgyLjc5LTQ4My44YzEuMDUuNiwyLjEsMS4yMiwzLjE0LDEuODQsMzIuMzQsMTkuMzQsNTguMjksNDYuMjcsNzcuMTIsODAuMDUsMzEuNyw1Ni44OCwzNC4zNTUsMTE4LjcyOCwzNC4zNTUsMTIxLjI0OGg0MC45MUw5MzYuMDctNDcxLjMyYy0yMy4yOC0xOC44Mi01Ny4wNS0zMi40Ny0xMDYuMDQtMzIuNDdoLS45NGEyMTcuNzUzLDIxNy43NTMsMCwwLDAtNDMuODMsNC4xOEE4LjU0OSw4LjU0OSwwLDAsMCw3ODIuNzktNDgzLjhaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTcuNTQ3IC0wLjcyNikiIGZpbGw9IiNhZmI0YjgiLz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPgo=';

export class Room implements Recipient {
  readonly recipientType = 'room';
  readonly jid: JID;
  // ??? maybe should have been current user occupant jid
  occupantJid: JID | undefined;
  description = '';
  subject = '';
  avatar = dummyAvatarRoom;
  // Room configuration
  info?: XmlSchemaForm;

  readonly messageStore: MessageStore = MessageStore.create();
  private readonly roomOccupants = new Map<string, RoomOccupant>();

  private readonly onOccupantChangeSubject = new ReplaySubject<OccupantChange>(Infinity, 1000);
  readonly onOccupantChange$ = this.onOccupantChangeSubject.asObservable();

  private readonly occupantsSubject = new ReplaySubject<RoomOccupant[]>(1);
  readonly occupants$ = this.occupantsSubject.asObservable();
  private _name?: string;

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

  constructor(private readonly logService: Log, roomJid: JID, name?: string) {
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
    console.log(
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
    let existingOccupant = this.roomOccupants.get(occupant.jid.toString());
    if (!existingOccupant) {
      existingOccupant = { ...occupant };
      existingOccupant.jid = parseJid(occupant.jid.toString());
    }
    existingOccupant.jid = new JID(
      existingOccupant.jid.local,
      existingOccupant.jid.domain,
      newNick
    );
    existingOccupant.nick = newNick;
    this.roomOccupants.delete(occupant.jid.toString());
    this.roomOccupants.set(existingOccupant.jid.toString(), existingOccupant);

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
    this.roomOccupants.set(occupant.jid.toString(), occupant);
    this.occupantsSubject.next([...this.roomOccupants.values()]);
  }

  private removeOccupant(occupant: RoomOccupant, isCurrentUser: boolean): void {
    if (isCurrentUser) {
      this.roomOccupants.clear();
      this.occupantsSubject.next([]);
    } else {
      if (this.roomOccupants.delete(occupant.jid.toString())) {
        this.occupantsSubject.next([...this.roomOccupants.values()]);
      }
    }
  }

  addOccupants(users: RoomOccupant[]): void {
    users.forEach((user) => this.addOccupant(user));
  }
}

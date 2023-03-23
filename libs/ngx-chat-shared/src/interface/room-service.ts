// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Observable } from 'rxjs';
import type { Room } from './room';
import type { Invitation } from './invitation';
import type { RoomCreationOptions } from './room-creation-options';
import type { RoomOccupant } from './room-occupant';
import type { XmlSchemaForm } from './xml-schema-form';

export interface RoomService {
  rooms$: Observable<Room[]>;

  onInvitation$: Observable<Invitation>;

  /**
   * Will emit the corresponding room when a new message arrive.
   */
  groupMessage$: Observable<Room>;

  joinRoom(jid: string): Promise<Room>;

  subscribeRoom(roomJid: string, nodes: string[]): Promise<void>;

  unsubscribeRoom(roomJid: string): Promise<void>;

  destroyRoom(roomJid: string): Promise<void>;

  createRoom(options: RoomCreationOptions): Promise<Room>;

  unbanUserForRoom(occupantJid: string, roomJid: string): Promise<void>;

  banUserForRoom(occupantJid: string, roomJid: string, reason?: string): Promise<void>;

  leaveRoom(occupantJid: string, status?: string): Promise<void>;

  declineRoomInvite(jid: string): void;

  queryRoomUserList(roomJid: string): Promise<RoomOccupant[]>;

  getRoomConfiguration(roomJid: string): Promise<XmlSchemaForm>;

  kickFromRoom(nick: string, roomJid: string, reason?: string): Promise<void>;

  inviteUserToRoom(inviteeJid: string, roomJid: string, invitationMessage?: string): Promise<void>;

  changeRoomSubject(roomJid: string, subject: string): Promise<void>;

  changeUserNicknameForRoom(newNick: string, roomJid: string): Promise<void>;

  grantMembershipForRoom(userJid: string, roomJid: string, reason?: string): Promise<void>;

  revokeMembershipForRoom(userJid: string, roomJid: string, reason?: string): Promise<void>;

  grantAdminForRoom(userJid: string, roomJid: string, reason?: string): Promise<void>;

  revokeAdminForRoom(userJid: string, roomJid: string, reason?: string): Promise<void>;

  grantModeratorStatusForRoom(
    occupantNick: string,
    roomJid: string,
    reason?: string
  ): Promise<void>;

  revokeModeratorStatusForRoom(
    occupantNick: string,
    roomJid: string,
    reason?: string
  ): Promise<void>;

  retrieveRoomSubscriptions(): Promise<Map<string, string[]>>;

  getRooms(): Promise<Room[]>;

  queryAllRooms(): Promise<Room[]>;
}

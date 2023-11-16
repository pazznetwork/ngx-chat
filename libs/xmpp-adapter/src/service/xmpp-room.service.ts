// SPDX-License-Identifier: MIT
import type {
  Invitation,
  Room,
  RoomCreationOptions,
  RoomService,
} from '@pazznetwork/ngx-chat-shared';
import { parseJid, RoomOccupant, XmlSchemaForm } from '@pazznetwork/ngx-chat-shared';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { MucSubPlugin, MultiUserChatPlugin } from '@pazznetwork/xmpp-adapter';
import { filter } from 'rxjs/operators';

export class XmppRoomService implements RoomService {
  groupMessage$: Observable<Room>;
  onInvitation$: Observable<Invitation>;
  rooms$: Observable<Room[]>;

  constructor(
    private readonly multiUserPlugin: MultiUserChatPlugin,
    private readonly mucSubPlugin: MucSubPlugin
  ) {
    this.onInvitation$ = multiUserPlugin.invitation$;
    this.rooms$ = multiUserPlugin.rooms$;
    this.groupMessage$ = multiUserPlugin.message$;
  }

  async createRoom(options: RoomCreationOptions): Promise<Room> {
    return this.multiUserPlugin.createRoom(options);
  }

  async destroyRoom(roomJid: string): Promise<void> {
    await this.multiUserPlugin.destroyRoom(parseJid(roomJid));
  }

  async leaveRoom(roomJid: string, status?: string): Promise<void> {
    const roomJidParsed = parseJid(roomJid);
    await this.multiUserPlugin.leaveRoom(roomJidParsed, status);
    await firstValueFrom(
      this.multiUserPlugin.leftRoom$.pipe(filter((jid) => jid.equals(roomJidParsed)))
    );
  }

  async retrieveRoomSubscriptions(): Promise<Map<string, string[]>> {
    return this.mucSubPlugin.retrieveSubscriptions();
  }

  async subscribeRoom(roomJid: string, nodes: string[]): Promise<void> {
    return this.mucSubPlugin.subscribeRoom(roomJid, nodes);
  }

  async unsubscribeRoom(roomJid: string): Promise<void> {
    return this.mucSubPlugin.unsubscribeRoom(roomJid);
  }

  async kickFromRoom(nick: string, roomJid: string, reason?: string): Promise<void> {
    await this.multiUserPlugin.kickFromRoom(nick, parseJid(roomJid), reason);
  }

  async queryAllRooms(): Promise<Room[]> {
    return this.multiUserPlugin.queryAllRooms();
  }

  async getRooms(): Promise<Room[]> {
    return this.multiUserPlugin.getRooms();
  }

  async banUserForRoom(occupantJid: string, roomJid: string, reason?: string): Promise<void> {
    await this.multiUserPlugin.banUser(parseJid(occupantJid), parseJid(roomJid), reason);
  }
  async unbanUserForRoom(occupantJid: string, roomJid: string): Promise<void> {
    await this.multiUserPlugin.unbanUser(parseJid(occupantJid), parseJid(roomJid));
  }

  async changeRoomSubject(roomJid: string, subject: string): Promise<void> {
    await this.multiUserPlugin.changeRoomSubject(parseJid(roomJid), subject);
  }

  async changeUserNicknameForRoom(newNick: string, roomJid: string): Promise<void> {
    await this.multiUserPlugin.changeUserNickname(newNick, parseJid(roomJid));
  }

  async grantAdminForRoom(userJid: string, roomJid: string, reason?: string): Promise<void> {
    await this.multiUserPlugin.grantAdmin(parseJid(userJid), parseJid(roomJid), reason);
  }

  async grantMembershipForRoom(userJid: string, roomJid: string, reason?: string): Promise<void> {
    await this.multiUserPlugin.grantMembership(parseJid(userJid), parseJid(roomJid), reason);
  }

  async grantModeratorStatusForRoom(
    occupantNick: string,
    roomJid: string,
    reason?: string
  ): Promise<void> {
    await this.multiUserPlugin.grantModeratorStatus(occupantNick, parseJid(roomJid), reason);
  }

  async inviteUserToRoom(
    inviteeJid: string,
    roomJid: string,
    invitationMessage?: string
  ): Promise<void> {
    await this.multiUserPlugin.inviteUser(
      parseJid(inviteeJid),
      parseJid(roomJid),
      invitationMessage
    );
  }

  async revokeAdminForRoom(userJid: string, roomJid: string, reason?: string): Promise<void> {
    await this.multiUserPlugin.revokeAdmin(parseJid(userJid), parseJid(roomJid), reason);
  }

  async revokeMembershipForRoom(userJid: string, roomJid: string, reason?: string): Promise<void> {
    await this.multiUserPlugin.revokeMembership(parseJid(userJid), parseJid(roomJid), reason);
  }

  async revokeModeratorStatusForRoom(
    occupantNick: string,
    roomJid: string,
    reason?: string
  ): Promise<void> {
    await this.multiUserPlugin.revokeModeratorStatus(occupantNick, parseJid(roomJid), reason);
  }

  async joinRoom(jid: string): Promise<Room> {
    return this.multiUserPlugin.joinRoom(parseJid(jid));
  }

  async declineRoomInvite(jid: string): Promise<void> {
    await this.multiUserPlugin.declineRoomInvite(parseJid(jid));
  }

  async queryRoomUserList(roomJid: string): Promise<RoomOccupant[]> {
    return this.multiUserPlugin.queryUserList(parseJid(roomJid));
  }

  async getRoomConfiguration(roomJid: string): Promise<XmlSchemaForm> {
    return this.multiUserPlugin.getRoomConfiguration(parseJid(roomJid));
  }

  async addRoomInfo(room: Room): Promise<Room> {
    room.info = await this.multiUserPlugin.getRoomInfo(room.jid);
    return room;
  }

  async getRoomByJid(roomJid: string): Promise<Room> {
    const room = await firstValueFrom(this.multiUserPlugin.getRoomByJid(parseJid(roomJid)));

    if (!room) {
      throw new Error(`room not found for jid ${roomJid}`);
    }

    return room;
  }
}

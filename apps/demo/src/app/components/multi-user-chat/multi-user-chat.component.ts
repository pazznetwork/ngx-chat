// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject } from '@angular/core';
import {
  Affiliation,
  ChatService,
  JID,
  parseJid,
  Recipient,
  Room,
  RoomCreationOptions,
  RoomOccupant,
  XmlSchemaForm,
} from '@pazznetwork/ngx-chat-shared';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
  selector: 'ngx-chat-multi-user-chat',
  templateUrl: './multi-user-chat.component.html',
  styleUrls: ['./multi-user-chat.component.css'],
})
export class MultiUserChatComponent {
  roomJidText?: string;
  roomJid?: JID | null = null;
  selectedRoom?: Recipient;
  allRooms: Room[] = [];
  roomUserList: RoomOccupant[] = [];
  newRoom?: RoomCreationOptions;
  mucSubSubscriptions = new Map<string, string[]>();
  roomConfiguration?: XmlSchemaForm;

  constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {}

  updateOccupantJid(enteredJid: string): void {
    this.roomJid = parseJid(enteredJid);
  }

  async joinRoom(occupantJid: JID | undefined | null): Promise<void> {
    if (!occupantJid) {
      throw new Error(`occupantJid is undefined`);
    }
    this.selectedRoom = await this.chatService.roomService.joinRoom(occupantJid.toString());
    this.roomJid = occupantJid;
    this.roomJidText = occupantJid.toString();
  }

  async subscribeWithMucSub(occupantJid: JID | undefined | null): Promise<void> {
    if (!occupantJid) {
      throw new Error(`occupantJid is undefined`);
    }
    await this.chatService.roomService.subscribeRoom(occupantJid.toString(), [
      'urn:xmpp:mucsub:nodes:messages',
    ]);
  }

  async unsubscribeFromMucSub(occupantJid: JID | undefined | null): Promise<void> {
    if (!occupantJid) {
      throw new Error(`occupantJid is undefined`);
    }
    await this.chatService.roomService.unsubscribeRoom(occupantJid.toString());
  }

  async getSubscriptions(): Promise<void> {
    this.mucSubSubscriptions = await this.chatService.roomService.retrieveRoomSubscriptions();
  }

  async queryUserList(occupantJid: JID | undefined | null): Promise<void> {
    if (!occupantJid) {
      throw new Error(`occupantJid is undefined`);
    }
    this.roomUserList = await this.chatService.roomService.queryRoomUserList(
      occupantJid.bare().toString()
    );
  }

  async getRoomConfiguration(occupantJid: JID | undefined | null): Promise<void> {
    if (!occupantJid) {
      throw new Error(`occupantJid is undefined`);
    }
    this.roomConfiguration = await this.chatService.roomService.getRoomConfiguration(
      occupantJid.bare().toString()
    );
  }

  displayMemberJid(member: RoomOccupant): string {
    if (!member) {
      throw new Error(`member is undefined`);
    }
    return member.jid.bare().toString();
  }

  displayMemberNicks(member: RoomOccupant): string | undefined {
    if (!member) {
      throw new Error(`member is undefined`);
    }
    return member.nick;
  }

  async destroyRoom(occupantJid: JID): Promise<void> {
    if (!occupantJid) {
      throw new Error(`occupantJid is undefined no roomJid in input field`);
    }
    await this.chatService.roomService.destroyRoom(occupantJid.toString());
    await this.queryAllRooms();
  }

  async queryAllRooms(): Promise<void> {
    const rooms = await this.chatService.roomService.queryAllRooms();
    this.allRooms = await Promise.all(
      rooms.map((room) => this.chatService.roomService.addRoomInfo(room))
    );
  }

  createNewRoom(): void {
    this.newRoom = {
      roomId: '',
      membersOnly: true,
      nonAnonymous: false,
      persistentRoom: true,
      public: false,
      allowSubscription: true,
    };
  }

  cancelRoomCreation(): void {
    this.newRoom = undefined;
  }

  async createRoomOnServer(): Promise<void> {
    if (!this.newRoom?.roomId || this.newRoom.roomId === '') {
      return;
    }

    const createdRoom = await this.chatService.roomService.createRoom(this.newRoom);
    if (!createdRoom.occupantJid) {
      throw new Error(`value is undefined`);
    }
    this.updateOccupantJid(createdRoom.occupantJid.toString());

    this.newRoom = undefined;
  }

  findIdWithNick(member: RoomOccupant): RoomOccupant {
    return member;
  }

  async kick(member: RoomOccupant): Promise<void> {
    const { nick } = this.findIdWithNick(member);
    if (!nick) {
      throw new Error(`nick is undefined`);
    }
    if (!this.selectedRoom?.jid) {
      throw new Error(`selectedRoom is undefined`);
    }
    await this.chatService.roomService.kickFromRoom(nick, this.selectedRoom.jid.toString());
  }

  async banOrUnban(member: RoomOccupant): Promise<void> {
    const memberJid = member.jid.bare();
    if (!this.selectedRoom?.jid) {
      throw new Error(`selectedRoom is undefined`);
    }
    if (member.affiliation === Affiliation.outcast) {
      await this.chatService.roomService.unbanUserForRoom(
        memberJid.toString(),
        this.selectedRoom.jid.toString()
      );
      return;
    }
    await this.chatService.roomService.banUserForRoom(
      memberJid.toString(),
      this.selectedRoom.jid.toString()
    );
  }

  async leaveRoom(roomJid: JID | undefined): Promise<void> {
    if (!roomJid) {
      throw new Error('roomJid was undefined for leaveRoom call');
    }
    if (roomJid.equals(this.roomJid?.bare())) {
      this.roomJidText = '';
      this.roomJid = null;
      this.selectedRoom = undefined;
    }
    await this.chatService.roomService.leaveRoom(roomJid.toString());
  }
}

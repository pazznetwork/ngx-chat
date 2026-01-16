// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input } from '@angular/core';
import type { Invitation } from '@pazznetwork/ngx-chat-shared';
import { ChatService, Direction, Room } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { ChatMessageInComponent } from '../chat-message-in';

@Component({
    imports: [CommonModule, ChatMessageInComponent],
    selector: 'ngx-chat-message-room-invite',
    templateUrl: './chat-message-room-invite.component.html',
    styleUrls: ['./chat-message-room-invite.component.less']
})
export class ChatMessageRoomInviteComponent {
  @Input()
  invitation?: Invitation;

  @Input()
  room?: Room;

  readonly Direction = Direction;

  constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {}

  async acceptRoomInvite(event: MouseEvent): Promise<void> {
    if (!this.invitation || !this.room) {
      return;
    }
    event.preventDefault();
    await this.chatService.roomService.joinRoom(this.invitation.roomJid.toString());
    this.room.clearRoomInvitation();
    this.invitation = undefined;
  }

  async declineRoomInvite(event: MouseEvent): Promise<void> {
    if (!this.invitation || !this.room) {
      return;
    }
    event.preventDefault();
    this.chatService.roomService.declineRoomInvite(this.invitation.roomJid.toString());
    this.room.clearRoomInvitation();
    this.invitation = undefined;
    await this.chatService.roomService.leaveRoom(this.room.jid.toString());
  }
}

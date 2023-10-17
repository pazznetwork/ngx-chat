// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input } from '@angular/core';
import type { Contact, Invitation } from '@pazznetwork/ngx-chat-shared';
import { ChatService, Direction } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { CHAT_SERVICE_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';
import { ChatMessageInComponent } from '../chat-message-in';

@Component({
  standalone: true,
  imports: [CommonModule, ChatMessageInComponent, XmppAdapterModule],
  selector: 'ngx-chat-message-room-invite',
  templateUrl: './chat-message-room-invite.component.html',
  styleUrls: ['./chat-message-room-invite.component.less'],
})
export class ChatMessageRoomInviteComponent {
  @Input()
  invitation?: Invitation;

  @Input()
  contact?: Contact;

  readonly Direction = Direction;

  constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {}

  async acceptRoomInvite(event: MouseEvent): Promise<void> {
    if (!this.invitation || !this.contact) {
      return;
    }
    event.preventDefault();
    await this.chatService.roomService.joinRoom(this.invitation.roomJid.toString());
    this.contact.clearRoomInvitation();
    this.invitation = undefined;
  }

  async declineRoomInvite(event: MouseEvent): Promise<void> {
    if (!this.invitation || !this.contact) {
      return;
    }
    event.preventDefault();
    this.chatService.roomService.declineRoomInvite(this.invitation.roomJid.toString());
    this.contact.clearRoomInvitation();
    this.invitation = undefined;
    await this.chatService.contactListService.removeContact(this.contact.jid.toString());
  }
}

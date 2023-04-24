// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, Optional } from '@angular/core';
import type { ChatContactClickHandler, Recipient } from '@pazznetwork/ngx-chat-shared';
import { ChatAvatarComponent } from '../chat-avatar';
import { CommonModule } from '@angular/common';
import { CONTACT_CLICK_HANDLER_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';

@Component({
  standalone: true,
  imports: [CommonModule, XmppAdapterModule, ChatAvatarComponent],
  selector: 'ngx-chat-bubble-avatar',
  templateUrl: './chat-bubble-avatar.component.html',
  styleUrls: ['./chat-bubble-avatar.component.less'],
})
export class ChatBubbleAvatarComponent {
  @Input()
  avatar?: string;

  @Input()
  avatarClickable = false;

  @Input()
  contact?: Recipient;

  @Input()
  showAvatar?: boolean;

  constructor(
    @Inject(CONTACT_CLICK_HANDLER_TOKEN)
    @Optional()
    public contactClickHandler: ChatContactClickHandler
  ) {}

  onContactClick(): void {
    if (!this.contactClickHandler) {
      return;
    }
    if (!this.contact) {
      return;
    }

    this.contactClickHandler.onClick(this.contact);
  }
}

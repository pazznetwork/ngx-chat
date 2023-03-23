// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, EventEmitter, Inject, Input, Optional, Output } from '@angular/core';
import {
  CHAT_SERVICE_TOKEN,
  ChatWindowState,
  CONTACT_CLICK_HANDLER_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import type { ChatContactClickHandler, ChatService } from '@pazznetwork/ngx-chat-shared';
import { Contact, isContact } from '@pazznetwork/ngx-chat-shared';
import { ChatAvatarComponent } from '../chat-avatar';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, XmppAdapterModule, ChatAvatarComponent],
  selector: 'ngx-chat-window-header',
  templateUrl: './chat-window-header.component.html',
  styleUrls: ['./chat-window-header.component.less'],
})
export class ChatWindowHeaderComponent {
  @Input()
  chatWindowState?: ChatWindowState;

  @Output()
  closeClick = new EventEmitter<void>();

  @Output()
  headerClick = new EventEmitter<void>();

  get recipientAsContact(): Contact {
    return this.chatWindowState?.recipient as Contact;
  }

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(CONTACT_CLICK_HANDLER_TOKEN)
    @Optional()
    readonly contactClickHandler: ChatContactClickHandler
  ) {}

  onContactClick($event: MouseEvent): void {
    if (
      !this.contactClickHandler ||
      this.chatWindowState?.isCollapsed ||
      !this.chatWindowState?.recipient
    ) {
      return;
    }

    $event.stopPropagation();
    this.contactClickHandler.onClick(this.chatWindowState.recipient);
  }

  isContactInWindow(
    chatWindowState: ChatWindowState | undefined
  ): chatWindowState is { recipient: Contact; isCollapsed: boolean } {
    if (!chatWindowState) {
      throw new Error(`chatWindowState is undefined, ${JSON.stringify(chatWindowState)}`);
    }
    return isContact(chatWindowState.recipient);
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, Optional } from '@angular/core';
import type { ChatService, Message, Recipient } from '@pazznetwork/ngx-chat-shared';
import { ChatContactClickHandler } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { ChatBubbleComponent } from '../chat-bubble';
import { ChatBubbleAvatarComponent } from '../chat-bubble-avatar';
import { ChatMessageTextAreaComponent } from '../chat-message-text-area';
import { ChatMessageImageComponent } from '../chat-message-image';
import { ChatBubbleFooterComponent } from '../chat-bubble-footer';
import { CHAT_SERVICE_TOKEN, CONTACT_CLICK_HANDLER_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
    imports: [
        CommonModule,
        ChatBubbleComponent,
        ChatBubbleAvatarComponent,
        ChatMessageTextAreaComponent,
        ChatMessageImageComponent,
        ChatBubbleFooterComponent,
    ],
    selector: 'ngx-chat-message-in',
    templateUrl: './chat-message-in.component.html',
    styleUrls: ['./chat-message-in.component.less']
})
export class ChatMessageInComponent {
  @Input()
  message?: Message;

  @Input()
  contact?: Recipient;

  @Input()
  showAvatar?: boolean;

  @Input()
  nick?: string;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Inject(CONTACT_CLICK_HANDLER_TOKEN)
    @Optional()
    public contactClickHandler: ChatContactClickHandler
  ) {}

  onContactClick(): void {
    if (!this.contact) {
      return;
    }

    this.contactClickHandler.onClick(this.contact);
  }
}

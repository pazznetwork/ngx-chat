// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject } from '@angular/core';
import type { ChatService } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
    imports: [CommonModule],
    selector: 'ngx-chat-message-empty',
    templateUrl: './chat-message-empty.component.html',
    styleUrls: ['./chat-message-empty.component.less']
})
export class ChatMessageEmptyComponent {
  constructor(@Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService) {}
}

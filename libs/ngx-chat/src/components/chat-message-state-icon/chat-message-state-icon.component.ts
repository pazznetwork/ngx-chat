// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input } from '@angular/core';
import { MessageState } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule],
    selector: 'ngx-chat-message-state-icon',
    templateUrl: './chat-message-state-icon.component.html',
    styleUrls: ['./chat-message-state-icon.component.less']
})
export class ChatMessageStateIconComponent {
  @Input()
  messageState?: MessageState;

  MessageState = MessageState;
}

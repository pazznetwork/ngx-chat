// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input } from '@angular/core';
import { ChatAvatarComponent } from '../chat-avatar';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule, ChatAvatarComponent],
    selector: 'ngx-chat-bubble',
    templateUrl: './chat-bubble.component.html',
    styleUrls: ['./chat-bubble.component.less']
})
export class ChatBubbleComponent {
  @Input()
  reverse = false;
}

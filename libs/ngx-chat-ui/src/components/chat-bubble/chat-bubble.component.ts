// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChatAvatarComponent } from '../chat-avatar';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, ChatAvatarComponent],
  selector: 'ngx-chat-bubble',
  templateUrl: './chat-bubble.component.html',
  styleUrls: ['./chat-bubble.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatBubbleComponent {}

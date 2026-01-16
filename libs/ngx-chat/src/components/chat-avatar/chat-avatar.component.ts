// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule],
    selector: 'ngx-chat-avatar',
    templateUrl: './chat-avatar.component.html',
    styleUrls: ['./chat-avatar.component.less']
})
export class ChatAvatarComponent {
  @Input()
  imageUrl: string | undefined;
}

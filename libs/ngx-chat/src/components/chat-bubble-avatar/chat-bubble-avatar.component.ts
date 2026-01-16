// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input, Output } from '@angular/core';
import { ChatAvatarComponent } from '../chat-avatar';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

@Component({
    imports: [CommonModule, ChatAvatarComponent],
    selector: 'ngx-chat-bubble-avatar',
    templateUrl: './chat-bubble-avatar.component.html',
    styleUrls: ['./chat-bubble-avatar.component.less']
})
export class ChatBubbleAvatarComponent {
  @Input()
  avatar: string | undefined | null;

  @Input()
  avatarClickable = false;

  @Input()
  showAvatar?: boolean;

  private clickedSubject = new Subject<void>();

  @Output()
  clicked$ = this.clickedSubject.asObservable();

  onContactClick(): void {
    if (!this.avatarClickable) {
      return;
    }

    this.clickedSubject.next();
  }
}

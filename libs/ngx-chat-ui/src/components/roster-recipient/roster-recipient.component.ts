// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, inject, InjectionToken, Input, OnInit } from '@angular/core';
import type { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { ChatAvatarComponent } from '../chat-avatar';
import { CHAT_SERVICE_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';

@Component({
  standalone: true,
  imports: [CommonModule, XmppAdapterModule, ChatAvatarComponent],
  selector: 'ngx-chat-roster-recipient',
  templateUrl: './roster-recipient.component.html',
  styleUrls: ['./roster-recipient.component.less'],
})
export class RosterRecipientComponent implements OnInit {
  @Input()
  recipient!: Recipient;

  unreadCount$?: Observable<number>;

  readonly chatService = inject(CHAT_SERVICE_TOKEN as any as InjectionToken<ChatService>);

  ngOnInit(): void {
    if (!this.recipient) {
      throw new Error('recipient cannot be undefined');
    }
    this.unreadCount$ = this.chatService.messageService.jidToUnreadCount$.pipe(
      map((jidToUnreadCount) => jidToUnreadCount.get(this.recipient.jid.toString()) || 0),
      distinctUntilChanged(),
      debounceTime(20)
    );
  }
}

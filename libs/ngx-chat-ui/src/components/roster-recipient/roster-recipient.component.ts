// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectorRef, Component, Inject, Input, OnInit } from '@angular/core';
import type { Observable } from 'rxjs';
import { combineLatestWith, ReplaySubject, tap } from 'rxjs';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { ChatAvatarComponent } from '../chat-avatar';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, ChatAvatarComponent],
  selector: 'ngx-chat-roster-recipient',
  templateUrl: './roster-recipient.component.html',
  styleUrls: ['./roster-recipient.component.less'],
})
export class RosterRecipientComponent implements OnInit {
  private recipientChangedSubject = new ReplaySubject<Recipient>(1);

  currentRecipient?: Recipient;
  @Input()
  set recipient(value: Recipient) {
    if (!value) {
      throw new Error('RosterRecipientComponent recipient was undefined');
    }
    this.currentRecipient = value;
    this.recipientChangedSubject.next(value);
  }

  unreadCount$?: Observable<number>;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.unreadCount$ = this.chatService.messageService.jidToUnreadCount$.pipe(
      combineLatestWith(this.recipientChangedSubject),
      map(
        ([jidToUnreadCount, recipient]) =>
          jidToUnreadCount.get(recipient.jid.bare().toString()) || 0
      ),
      distinctUntilChanged(),
      debounceTime(20),
      tap(() => setTimeout(() => this.cdr.detectChanges(), 0))
    );
  }
}

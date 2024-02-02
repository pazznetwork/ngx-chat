// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';
import type { ChatService, Contact, Recipient } from '@pazznetwork/ngx-chat-shared';
import { OpenChatStateService, Room } from '@pazznetwork/ngx-chat-shared';
import { CHAT_LIST_STATE_SERVICE_TOKEN, CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { CommonModule } from '@angular/common';
import { RosterRecipientComponent } from '../roster-recipient';
import { RosterRecipientPresenceComponent } from '../roster-recipient-presence';

@Component({
  standalone: true,
  imports: [CommonModule, RosterRecipientComponent, RosterRecipientPresenceComponent],
  selector: 'ngx-chat-roster-list',
  templateUrl: './roster-list.component.html',
  styleUrls: ['./roster-list.component.less'],
  animations: [
    trigger('rosterVisibility', [
      state(
        'hidden',
        style({
          right: '-14em',
        })
      ),
      state(
        'shown',
        style({
          right: '0em',
        })
      ),
      transition('hidden => shown', animate('400ms ease')),
      transition('shown => hidden', animate('400ms ease')),
    ]),
    trigger('drawerVisibility', [
      state(
        'hidden',
        style({
          right: '0em',
        })
      ),
      state(
        'shown',
        style({
          right: '14em',
        })
      ),
      transition('hidden => shown', animate('400ms ease')),
      transition('shown => hidden', animate('400ms ease')),
    ]),
  ],
})
export class RosterListComponent {
  @Input()
  blocked$?: Observable<Contact[]>;

  @Input()
  contacts$?: Observable<Contact[]>;

  @Input()
  contactRequestsReceived$?: Observable<Contact[]>;

  @Input()
  contactsUnaffiliated$?: Observable<Contact[]>;

  @Input()
  hasNoContacts$?: Observable<boolean>;

  @Input()
  rosterState?: 'hidden' | 'shown';

  @Input()
  rooms$?: Observable<Room[]>;

  @Output()
  rosterStateChanged = new EventEmitter<'hidden' | 'shown'>();

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(CHAT_LIST_STATE_SERVICE_TOKEN)
    private readonly chatListService: OpenChatStateService
  ) {}

  onClickRecipient(recipient: Recipient): void {
    this.chatListService.openChat(recipient, false);
  }

  toggleVisibility(): void {
    const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
    this.rosterStateChanged.emit(newState);
  }
}

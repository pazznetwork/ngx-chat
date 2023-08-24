// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ChatService, Contact, Recipient } from '@pazznetwork/ngx-chat-shared';
import { CHAT_SERVICE_TOKEN, ChatListStateService, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';
import { CommonModule } from '@angular/common';
import { RosterRecipientComponent } from '../roster-recipient';
import { RosterRecipientPresenceComponent } from '../roster-recipient-presence';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    XmppAdapterModule,
    RosterRecipientComponent,
    RosterRecipientPresenceComponent,
  ],
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RosterListComponent implements OnInit {
  @Input()
  rosterState?: 'hidden' | 'shown';

  @Input()
  contacts$?: Observable<Contact[]>;

  @Input()
  contactRequestsReceived$?: Observable<Contact[]>;

  @Input()
  contactsUnaffiliated$?: Observable<Contact[]>;

  @Input()
  blocked$?: Observable<Contact[]>;

  hasNoContacts$?: Observable<boolean>;

  @Output()
  rosterStateChanged = new EventEmitter<'hidden' | 'shown'>();

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    private readonly chatListService: ChatListStateService
  ) {}

  ngOnInit(): void {
    this.contacts$ =
      this.contacts$ ?? this.chatService.contactListService.contactsSubscribed$.pipe();
    this.contactRequestsReceived$ =
      this.contactRequestsReceived$ ??
      this.chatService.contactListService.contactRequestsReceived$.pipe();
    this.contactsUnaffiliated$ =
      this.contactsUnaffiliated$ ??
      this.chatService.contactListService.contactsUnaffiliated$.pipe();
    this.blocked$ = this.blocked$ ?? this.chatService.contactListService.blockedContacts$.pipe();

    this.hasNoContacts$ = merge(
      this.contacts$,
      this.contactRequestsReceived$,
      this.contactsUnaffiliated$,
      this.blocked$
    ).pipe(map((arr) => arr.length === 0));
  }

  onClickRecipient(recipient: Recipient): void {
    this.chatListService.openChat(recipient);
  }

  toggleVisibility(): void {
    const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
    this.rosterStateChanged.emit(newState);
  }
}

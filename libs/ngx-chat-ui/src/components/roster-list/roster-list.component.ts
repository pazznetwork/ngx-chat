// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { combineLatest, filter, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Contact, Recipient } from '@pazznetwork/ngx-chat-shared';
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
  contactRequestsSent$?: Observable<Contact[]>;

  @Input()
  contactsUnaffiliated$?: Observable<Contact[]>;

  hasNoContacts$?: Observable<boolean>;

  @Output()
  rosterStateChanged = new EventEmitter<'hidden' | 'shown'>();

  readonly chatService = inject(CHAT_SERVICE_TOKEN);
  private readonly chatListService = inject(ChatListStateService);

  ngOnInit(): void {
    this.contacts$ = this.contacts$ ?? this.chatService.contactListService.contactsSubscribed$;
    this.contactRequestsReceived$ =
      this.contactRequestsReceived$ ??
      this.chatService.contactListService.contactRequestsReceived$.pipe(
        filter((contacts) => contacts.length > 0)
      );
    this.contactRequestsSent$ =
      this.contactRequestsSent$ ??
      this.chatService.contactListService.contactRequestsSent$.pipe(
        filter((contacts) => contacts.length > 0)
      );
    this.contactsUnaffiliated$ =
      this.contactsUnaffiliated$ ??
      this.chatService.contactListService.contactsUnaffiliated$.pipe(
        filter((contacts) => contacts.length > 0)
      );

    this.hasNoContacts$ = combineLatest([
      this.contacts$,
      this.contactRequestsReceived$,
      this.contactRequestsSent$,
      this.contactsUnaffiliated$,
    ]).pipe(
      map(
        ([contacts, received, sent, unaffiliated]) =>
          contacts.length + received.length + sent.length + unaffiliated.length === 0
      )
    );
  }

  onClickRecipient(recipient: Recipient): void {
    this.chatListService.openChat(recipient);
  }

  toggleVisibility(): void {
    const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
    this.rosterStateChanged.emit(newState);
  }
}

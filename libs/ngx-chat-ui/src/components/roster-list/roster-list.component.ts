// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Observable, tap } from 'rxjs';
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
export class RosterListComponent implements OnInit {
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
    private readonly chatListService: OpenChatStateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.blocked$) {
      this.blocked$ = this.blocked$.pipe(tap(() => setTimeout(() => this.cdr.detectChanges(), 0)));
    }

    if (this.contacts$) {
      this.contacts$ = this.contacts$.pipe(
        tap(() => setTimeout(() => this.cdr.detectChanges(), 0))
      );
    }

    if (this.contactRequestsReceived$) {
      this.contactRequestsReceived$ = this.contactRequestsReceived$.pipe(
        tap(() => setTimeout(() => this.cdr.detectChanges(), 0))
      );
    }

    if (this.contactsUnaffiliated$) {
      this.contactsUnaffiliated$ = this.contactsUnaffiliated$.pipe(
        tap(() => setTimeout(() => this.cdr.detectChanges(), 0))
      );
    }

    if (this.rooms$) {
      this.rooms$ = this.rooms$.pipe(tap(() => setTimeout(() => this.cdr.detectChanges(), 0)));
    }
  }

  onClickRecipient(recipient: Recipient): void {
    this.chatListService.openChat(recipient, false);
  }

  toggleVisibility(): void {
    const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
    this.rosterStateChanged.emit(newState);
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, Optional } from '@angular/core';
import { map, merge, Observable, startWith, Subject } from 'rxjs';
import {
  CHAT_LIST_STATE_SERVICE_TOKEN,
  CHAT_SERVICE_TOKEN,
  REPORT_USER_INJECTION_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import type { ChatService, Contact, ReportUserService } from '@pazznetwork/ngx-chat-shared';
import { ContactSubscription, OpenChatStateService } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { ChatBubbleComponent } from '../chat-bubble';
import { shareReplay } from 'rxjs/operators';

enum SubscriptionAction {
  PENDING_REQUEST,
  SHOW_BLOCK_ACTIONS,
  // There is no contact request on both sites but only a message
  UNAFFILIATED,
  NO_PENDING_ACTION,
}

@Component({
  standalone: true,
  imports: [CommonModule, XmppAdapterModule, ChatBubbleComponent],
  selector: 'ngx-chat-message-contact-request',
  templateUrl: './chat-message-contact-request.component.html',
  styleUrls: ['./chat-message-contact-request.component.less'],
})
export class ChatMessageContactRequestComponent {
  private requestContact?: Contact;

  @Input()
  set pendingRequestContact(contact: Contact | undefined) {
    if (contact == null) {
      throw new Error('no pending request contact in chat message contact request component');
    }

    this.requestContact = contact;

    this.subscriptionAction$ = merge(
      contact.subscription$.pipe(
        map((subscription) => {
          if (subscription === ContactSubscription.from) {
            return SubscriptionAction.PENDING_REQUEST;
          } else if (subscription === ContactSubscription.none) {
            return SubscriptionAction.UNAFFILIATED;
          }
          return SubscriptionAction.NO_PENDING_ACTION;
        })
      ),
      this.subscriptionActionSubject
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.message$ = this.subscriptionAction$.pipe(
      map((sub) => {
        if (sub === SubscriptionAction.UNAFFILIATED) {
          return this.chatService.translations.unaffiliatedMessage;
        }
        return this.chatService.translations.subscriptionRequestMessage;
      })
    );

    this.showAccept$ = this.subscriptionAction$.pipe(
      map((sub) => sub === SubscriptionAction.PENDING_REQUEST)
    );
    this.showAdd$ = this.subscriptionAction$.pipe(
      map((sub) => sub === SubscriptionAction.UNAFFILIATED)
    );
  }

  private subscriptionActionSubject = new Subject<SubscriptionAction>();
  subscriptionAction$!: Observable<SubscriptionAction>;
  message$!: Observable<string>;

  showAccept$!: Observable<boolean>;
  showAdd$!: Observable<boolean>;
  private showAllSubject = new Subject<boolean>();
  showAll$ = this.showAllSubject.pipe(startWith(true));

  constructor(
    @Inject(CHAT_LIST_STATE_SERVICE_TOKEN)
    public chatListService: OpenChatStateService,
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Optional() @Inject(REPORT_USER_INJECTION_TOKEN) public reportUserService: ReportUserService
  ) {}

  async acceptSubscriptionRequest(): Promise<void> {
    if (!this.requestContact) {
      throw new Error('no pending request contact in chat message contact request component');
    }
    await this.chatService.contactListService.addContact(this.requestContact.jid.toString());
    this.showAllSubject.next(false);
  }

  async removeContact(): Promise<void> {
    if (!this.requestContact) {
      throw new Error('no pending request contact in chat message contact request component');
    }
    await this.chatService.contactListService.removeContact(this.requestContact.jid.toString());
    this.showAllSubject.next(false);
  }

  async blockUser(): Promise<void> {
    if (!this.requestContact) {
      throw new Error('no pending request contact in chat message contact request component');
    }
    await this.chatService.contactListService.blockJid(this.requestContact.jid.toString());
    this.chatListService.closeChat(this.requestContact);
    this.showAllSubject.next(false);
  }

  async blockUserAndReport(): Promise<void> {
    if (!this.requestContact) {
      throw new Error('no pending request contact in chat message contact request component');
    }
    this.reportUserService.reportUser(this.requestContact);
    await this.blockUser();
  }
}

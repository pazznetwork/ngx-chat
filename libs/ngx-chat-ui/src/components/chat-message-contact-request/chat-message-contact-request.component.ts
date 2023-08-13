// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { map, merge, Observable, Subject } from 'rxjs';
import {
  CHAT_SERVICE_TOKEN,
  ChatListStateService,
  REPORT_USER_INJECTION_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import type { ChatService, Contact, ReportUserService } from '@pazznetwork/ngx-chat-shared';
import { ContactSubscription } from '@pazznetwork/ngx-chat-shared';
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
export class ChatMessageContactRequestComponent implements OnInit {
  @Input()
  contact!: Contact;

  private subscriptionActionSubject = new Subject<SubscriptionAction>();
  subscriptionAction$!: Observable<SubscriptionAction>;
  message$!: Observable<string>;

  showAccept$!: Observable<boolean>;
  showAdd$!: Observable<boolean>;

  constructor(
    public chatListService: ChatListStateService,
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Optional() @Inject(REPORT_USER_INJECTION_TOKEN) public reportUserService: ReportUserService
  ) {}

  ngOnInit(): void {
    this.subscriptionAction$ = merge(
      this.contact.subscription$.pipe(
        map((subscription) => {
          console.log('subscription Action sub:', subscription);
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

  async acceptSubscriptionRequest(): Promise<void> {
    await this.chatService.contactListService.addContact(this.contact.jid.toString());
  }

  async removeContact(): Promise<void> {
    await this.chatService.contactListService.removeContact(this.contact.jid.toString());
  }

  async blockUser(): Promise<void> {
    await this.chatService.contactListService.blockJid(this.contact.jid.toString());
    this.chatListService.closeChat(this.contact);
  }

  async blockUserAndReport(): Promise<void> {
    this.reportUserService.reportUser(this.contact);
    await this.blockUser();
  }
}

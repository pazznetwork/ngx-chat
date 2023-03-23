// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { firstValueFrom, map, merge, Observable, Subject } from 'rxjs';
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
  BLOCK_FOR_UNAFFILIATED,
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

  showDenyActions$!: Observable<boolean>;
  isActionDisabled$!: Observable<boolean>;
  isAffiliated$!: Observable<boolean>;

  constructor(
    public chatListService: ChatListStateService,
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Optional() @Inject(REPORT_USER_INJECTION_TOKEN) public reportUserService: ReportUserService
  ) {}

  ngOnInit(): void {
    this.subscriptionAction$ = merge(
      this.contact.subscription$.pipe(
        map((subscription) => {
          if (subscription === ContactSubscription.to) {
            return SubscriptionAction.PENDING_REQUEST;
          } else if (subscription === ContactSubscription.none) {
            return SubscriptionAction.BLOCK_FOR_UNAFFILIATED;
          }
          return SubscriptionAction.NO_PENDING_ACTION;
        })
      ),
      this.subscriptionActionSubject
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.message$ = this.subscriptionAction$.pipe(
      map((sub) => {
        if (sub === SubscriptionAction.BLOCK_FOR_UNAFFILIATED) {
          return this.chatService.translations.unaffiliatedMessage;
        }
        return this.chatService.translations.subscriptionRequestMessage;
      })
    );

    this.showDenyActions$ = this.subscriptionAction$.pipe(
      map((sub) =>
        [SubscriptionAction.SHOW_BLOCK_ACTIONS, SubscriptionAction.BLOCK_FOR_UNAFFILIATED].includes(
          sub
        )
      )
    );

    this.isActionDisabled$ = this.subscriptionAction$.pipe(
      map((sub) => sub === SubscriptionAction.SHOW_BLOCK_ACTIONS)
    );

    this.isAffiliated$ = this.subscriptionAction$.pipe(
      map((sub) => sub !== SubscriptionAction.BLOCK_FOR_UNAFFILIATED)
    );
  }

  async acceptSubscriptionRequest(): Promise<void> {
    const sub = await firstValueFrom(this.subscriptionAction$);

    if (sub !== SubscriptionAction.PENDING_REQUEST) {
      return;
    }

    await this.chatService.contactListService.addContact(this.contact.jid.toString());
    this.subscriptionActionSubject.next(SubscriptionAction.NO_PENDING_ACTION);
  }

  async denySubscriptionRequest(): Promise<void> {
    const sub = await firstValueFrom(this.subscriptionAction$);

    if (sub !== SubscriptionAction.PENDING_REQUEST) {
      return;
    }

    await this.chatService.contactListService.removeContact(this.contact.jid.toString());
    this.subscriptionActionSubject.next(SubscriptionAction.SHOW_BLOCK_ACTIONS);
  }

  async blockContact(): Promise<void> {
    await this.chatService.contactListService.blockJid(this.contact.jid.toString());
    this.chatListService.closeChat(this.contact);
    this.subscriptionActionSubject.next(SubscriptionAction.NO_PENDING_ACTION);
  }

  async blockContactAndReport(): Promise<void> {
    this.reportUserService.reportUser(this.contact);
    await this.blockContact();
  }

  dismissBlockOptions(): void {
    this.subscriptionActionSubject.next(SubscriptionAction.NO_PENDING_ACTION);
  }
}

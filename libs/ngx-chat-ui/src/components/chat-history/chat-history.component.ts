// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { exhaustMap, map, Observable, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { Contact } from '@pazznetwork/ngx-chat-shared';
import { ChatMessageInComponent } from '../chat-message-in';
import { CommonModule } from '@angular/common';
import { ChatMessageEmptyComponent } from '../chat-message-empty';
import { ChatMessageOutComponent } from '../chat-message-out';
import { ChatMessageContactRequestComponent } from '../chat-message-contact-request';
import {
  CHAT_SERVICE_TOKEN,
  ChatMessageListRegistryService,
  OPEN_CHAT_SERVICE_TOKEN,
} from '@pazznetwork/ngx-xmpp';
import { ChatHistoryAutoScrollComponent } from '../chat-history-auto-scroll';
import { ChatHistoryMessagesComponent } from '../chat-history-messages';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ChatHistoryMessagesComponent,
    ChatMessageEmptyComponent,
    ChatMessageInComponent,
    ChatMessageOutComponent,
    ChatMessageContactRequestComponent,
    ChatHistoryAutoScrollComponent,
  ],
  selector: 'ngx-chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.less'],
})
export class ChatHistoryComponent implements OnInit, OnDestroy {
  @Input()
  recipient?: Recipient;

  @Input()
  sender?: Contact;

  @Input()
  pendingRequestContact?: Contact;

  @Input()
  showAvatars = false;

  @Input()
  scheduleScrollToBottom$?: Observable<void>;

  @Input()
  pendingRequest$!: Observable<boolean>;

  private ngDestroySubject = new Subject<void>();
  private scheduleLoadMessagesSubject = new Subject<void>();

  private isLoadingMessages = false;

  noMessages$!: Observable<boolean>;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) public chatMessageListRegistry: ChatMessageListRegistryService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.recipient) {
      return;
    }
    this.noMessages$ = this.recipient.messageStore.messages$.pipe(
      map((messages) => messages.length === 0)
    );

    this.chatMessageListRegistry.incrementOpenWindowCount(this.recipient);
    this.loadMessagesOnScrollToTop();
  }

  ngOnDestroy(): void {
    console.log('ChatHistoryComponent ngOnDestroy');
    if (!this.recipient) {
      return;
    }
    this.ngDestroySubject.next();
    this.chatMessageListRegistry.decrementOpenWindowCount(this.recipient);
  }

  scheduleLoadMessages(): void {
    this.scheduleLoadMessagesSubject.next();
  }

  private loadMessagesOnScrollToTop(): void {
    this.scheduleLoadMessagesSubject
      .pipe(
        filter(() => !this.isLoadingMessages),
        debounceTime(1000),
        exhaustMap(async () => {
          if (!this.recipient) {
            return;
          }
          this.isLoadingMessages = true;

          try {
            // improve performance when loading lots of old messages
            this.changeDetectorRef.detach();
            await this.chatService.messageService.loadMostRecentUnloadedMessages(this.recipient);
          } finally {
            this.changeDetectorRef.reattach();
            this.isLoadingMessages = false;
          }
        }),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe();
  }
}

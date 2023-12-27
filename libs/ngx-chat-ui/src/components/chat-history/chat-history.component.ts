// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { exhaustMap, map, Observable, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { ChatService, Contact, Recipient, Room } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { ChatMessageEmptyComponent } from '../chat-message-empty';
import { ChatMessageContactRequestComponent } from '../chat-message-contact-request';
import {
  CHAT_SERVICE_TOKEN,
  ChatMessageListRegistryService,
  OPEN_CHAT_SERVICE_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import { ChatHistoryAutoScrollComponent } from '../chat-history-auto-scroll';
import { ChatHistoryMessagesContactComponent } from '../chat-history-messages-contact';
import { ChatHistoryMessagesRoomComponent } from '../chat-history-messages-room';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    XmppAdapterModule,
    ChatMessageEmptyComponent,
    ChatMessageContactRequestComponent,
    ChatHistoryAutoScrollComponent,
    ChatHistoryMessagesContactComponent,
    ChatHistoryMessagesRoomComponent,
  ],
  selector: 'ngx-chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.less'],
})
export class ChatHistoryComponent implements OnInit, OnDestroy {
  currentRecipient?: Recipient;
  @Input()
  set recipient(value: Recipient | undefined) {
    if (!value) {
      throw new Error('ChatHistoryComponent: recipient was null or undefined');
    }

    this.noMessages$ = value.messageStore.messages$.pipe(map((messages) => messages.length === 0));
    this.currentRecipient = value;

    this.loadMessagesOnScrollToTop();
  }

  @Input()
  sender?: Contact;

  @Input()
  pendingRequestContact?: Contact;

  @Input()
  showAvatars = true;

  @Input()
  maxHeight = 'none';

  @Input()
  pendingRequest$!: Observable<boolean>;

  private ngDestroySubject = new Subject<void>();
  private scheduleLoadMessagesSubject = new Subject<void>();

  private isLoadingMessages = false;

  noMessages$!: Observable<boolean>;

  isContact(recipient: Recipient | undefined): boolean {
    if (!recipient) {
      return false;
    }
    return recipient.recipientType === 'contact';
  }

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) private chatMessageListRegistry: ChatMessageListRegistryService
  ) {}

  ngOnInit(): void {
    if (!this.currentRecipient) {
      throw new Error('ChatHistoryComponent: recipient was null or undefined');
    }

    // the unread count plugin relies on this behaviour
    this.chatMessageListRegistry.incrementOpenWindowCount(this.currentRecipient);
  }

  ngOnDestroy(): void {
    if (!this.currentRecipient) {
      throw new Error('ChatHistoryComponent: recipient was null or undefined');
    }

    this.ngDestroySubject.next();
    // the unread count plugin relies on this behaviour
    this.chatMessageListRegistry.decrementOpenWindowCount(this.currentRecipient);
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
          if (!this.currentRecipient) {
            throw new Error('ChatHistoryComponent: recipient was null or undefined');
          }
          this.isLoadingMessages = true;

          try {
            // improve performance when loading lots of old messages
            this.changeDetectorRef.detach();
            await this.chatService.messageService.loadMostRecentUnloadedMessages(
              this.currentRecipient
            );
          } finally {
            this.changeDetectorRef.reattach();
            this.isLoadingMessages = false;
          }
        }),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe();
  }

  asContact(recipient: Recipient | undefined): Contact {
    return recipient as Contact;
  }

  asRoom(recipient: Recipient | undefined): Room {
    return recipient as Room;
  }
}

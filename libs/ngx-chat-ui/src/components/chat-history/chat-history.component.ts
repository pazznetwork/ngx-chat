// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { map, mergeMap, Observable, of, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { Contact, ContactSubscription, Direction, Message } from '@pazznetwork/ngx-chat-shared';
import { ChatMessageInComponent } from '../chat-message-in';
import { CommonModule } from '@angular/common';
import { ChatMessageEmptyComponent } from '../chat-message-empty';
import { ChatMessageOutComponent } from '../chat-message-out';
import { IntersectionObserverDirective } from '../../directives';
import { ChatMessageContactRequestComponent } from '../chat-message-contact-request';
import {
  CHAT_SERVICE_TOKEN,
  ChatMessageListRegistryService,
  OPEN_CHAT_SERVICE_TOKEN,
} from '@pazznetwork/ngx-xmpp';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageEmptyComponent,
    ChatMessageInComponent,
    ChatMessageOutComponent,
    IntersectionObserverDirective,
    ChatMessageContactRequestComponent,
  ],
  selector: 'ngx-chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHistoryComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input()
  recipient?: Recipient;

  @Input()
  showAvatars?: boolean;

  @ViewChild('messageArea')
  chatMessageAreaElement!: ElementRef<HTMLElement>;

  @ViewChildren(ChatMessageInComponent)
  chatMessageViewChildrenList!: QueryList<ChatMessageInComponent>;

  private ngDestroySubject = new Subject<void>();
  private onTopSubject = new Subject<IntersectionObserverEntry>();
  private isAtBottom = true;
  private bottomLeftAt = 0;
  private oldestVisibleMessageBeforeLoading?: Message;

  messagesGroupedByDate$?: Observable<{ date: Date; messages: Message[] }[]>;
  noMessages$!: Observable<boolean>;
  pendingRequest$!: Observable<boolean>;

  Direction = Direction;
  onTop$ = this.onTopSubject.asObservable();

  get recipientAsContact(): Contact {
    return this.recipient as Contact;
  }

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) public chatMessageListRegistry: ChatMessageListRegistryService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.onTop$
      .pipe(
        filter((event) => event.isIntersecting),
        debounceTime(1000),
        mergeMap(() => this.loadOlderMessagesBeforeViewport()),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe();

    if (!this.recipient) {
      return;
    }

    this.messagesGroupedByDate$ = this.recipient.messageStore.messages$.pipe(
      map((messages) => {
        messages.sort((a, b) => a?.datetime?.getTime() - b?.datetime?.getTime());
        const messageMap = new Map<string, Message[]>();
        for (const message of messages) {
          const key = message.datetime.toDateString();
          if (messageMap.has(key)) {
            messageMap.get(key)?.push(message);
          } else {
            messageMap.set(key, [message]);
          }
        }

        const returnArray = new Array<{ date: Date; messages: Message[] }>();

        for (const [key, mapMessages] of messageMap) {
          returnArray.push({ date: new Date(key), messages: mapMessages });
        }

        return returnArray;
      }),
      takeUntil(this.ngDestroySubject)
    );

    if (this.recipient instanceof Contact) {
      this.pendingRequest$ = this.recipient.subscription$.pipe(
        map((subscription) => subscription !== ContactSubscription.both)
      );
    } else {
      this.pendingRequest$ = of(false);
    }

    this.pendingRequest$
      .pipe(
        filter((val) => val),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe(() => this.scheduleScrollToLastMessage());

    this.noMessages$ = this.recipient.messageStore.messages$.pipe(
      map((messages) => messages.length === 0)
    );

    this.chatMessageListRegistry.incrementOpenWindowCount(this.recipient);
  }

  async ngAfterViewInit(): Promise<void> {
    this.chatMessageViewChildrenList.changes
      .pipe(takeUntil(this.ngDestroySubject))
      .subscribe(() => {
        if (this.oldestVisibleMessageBeforeLoading) {
          this.scrollToMessage(this.oldestVisibleMessageBeforeLoading);
        }
        this.oldestVisibleMessageBeforeLoading = undefined;
      });

    this.recipient?.messageStore.messages$
      .pipe(
        debounceTime(10),
        filter(() => this.isNearBottom()),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe((_) => this.scheduleScrollToLastMessage());

    if (this.recipient && this.recipient.messageStore?.messages?.length < 10) {
      await this.loadMessages(); // in case insufficient old messages are displayed
    }
    this.scheduleScrollToLastMessage();
  }

  ngOnChanges({ contact }: SimpleChanges): void {
    if (!contact?.currentValue) {
      return;
    }

    if (contact.previousValue) {
      this.chatMessageListRegistry.decrementOpenWindowCount(contact.previousValue as Recipient);

      this.chatMessageListRegistry.incrementOpenWindowCount(contact.currentValue as Recipient);
    }

    this.scheduleScrollToLastMessage();
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
    if (!this.recipient) {
      return;
    }

    this.chatMessageListRegistry.decrementOpenWindowCount(this.recipient);
  }

  scheduleScrollToLastMessage(): void {
    setTimeout(() => this.scrollToLastMessage(), 0);
  }

  async loadOlderMessagesBeforeViewport(): Promise<void> {
    if (this.isLoadingHistory() || this.isNearBottom() || !this.recipient) {
      return;
    }

    try {
      this.oldestVisibleMessageBeforeLoading = this.recipient.messageStore.oldestMessage;
      await this.loadMessages();
    } catch (e) {
      this.oldestVisibleMessageBeforeLoading = undefined;
    }
  }

  onBottom(event: IntersectionObserverEntry): void {
    this.isAtBottom = event.isIntersecting;

    if (event.isIntersecting) {
      this.isAtBottom = true;
    } else {
      this.isAtBottom = false;
      this.bottomLeftAt = Date.now();
    }
  }

  onTop(event: IntersectionObserverEntry): void {
    this.onTopSubject.next(event);
  }

  private scrollToLastMessage(): void {
    if (!this.chatMessageAreaElement) {
      return;
    }

    this.chatMessageAreaElement.nativeElement.scrollTop =
      this.chatMessageAreaElement.nativeElement.scrollHeight;
    this.isAtBottom = true; // in some browsers the intersection observer does not emit when scrolling programmatically
  }

  private scrollToMessage(message: Message): void {
    if (!this.chatMessageAreaElement) {
      return;
    }

    const htmlIdAttribute = 'message-' + message.id;
    const messageElement = document.getElementById(htmlIdAttribute);
    messageElement?.scrollIntoView(false);
  }

  private async loadMessages(): Promise<void> {
    if (!this.recipient) {
      return;
    }

    try {
      // improve performance when loading lots of old messages
      this.changeDetectorRef.detach();
      await this.chatService.messageService.loadMostRecentUnloadedMessages(this.recipient);
    } finally {
      this.changeDetectorRef.reattach();
    }
  }

  private isNearBottom(): boolean {
    return this.isAtBottom || Date.now() - this.bottomLeftAt < 1000;
  }

  private isLoadingHistory(): boolean {
    return !!this.oldestVisibleMessageBeforeLoading;
  }
}

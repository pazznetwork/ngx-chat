// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { map, Observable, ReplaySubject, Subject, tap } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import type { ChatService } from '@pazznetwork/ngx-chat-shared';
import { Contact, Direction, Message } from '@pazznetwork/ngx-chat-shared';
import { ChatMessageInComponent } from '../chat-message-in';
import { CommonModule } from '@angular/common';
import { ChatMessageEmptyComponent } from '../chat-message-empty';
import { ChatMessageOutComponent } from '../chat-message-out';
import {
  CHAT_SERVICE_TOKEN,
  ChatMessageListRegistryService,
  OPEN_CHAT_SERVICE_TOKEN,
} from '@pazznetwork/ngx-xmpp';
import { ChatHistoryAutoScrollComponent } from '../chat-history-auto-scroll';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageEmptyComponent,
    ChatMessageInComponent,
    ChatMessageOutComponent,
    ChatHistoryAutoScrollComponent,
  ],
  selector: 'ngx-chat-history-messages-contact',
  templateUrl: './chat-history-messages-contact.component.html',
  styleUrls: ['./chat-history-messages-contact.component.less'],
})
export class ChatHistoryMessagesContactComponent implements OnInit, OnDestroy {
  @Input()
  contact!: Contact;

  @Input()
  showAvatars = true;

  private ngDestroySubject = new Subject<void>();
  private messagesGroupedByDateSubject = new ReplaySubject<{ date: Date; messages: Message[] }[]>(
    1
  );

  // can not render two components with the same recipient example index.html and in chat-window, waisted time 8h
  messagesGroupedByDate$: Observable<{ date: Date; messages: Message[] }[]> =
    this.messagesGroupedByDateSubject.asObservable();

  Direction = Direction;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) public chatMessageListRegistry: ChatMessageListRegistryService,
    readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.contact.messageStore.messages$
      .pipe(
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
        tap(() => setTimeout(() => this.cdr.detectChanges(), 0)),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe(this.messagesGroupedByDateSubject);
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }
}

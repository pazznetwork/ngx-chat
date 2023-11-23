// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { mergeMap, Observable, ReplaySubject, Subject, tap } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import type { ChatService, CustomContactFactory } from '@pazznetwork/ngx-chat-shared';
import { Contact, Direction, Message, Room } from '@pazznetwork/ngx-chat-shared';
import { ChatMessageInComponent } from '../chat-message-in';
import { CommonModule } from '@angular/common';
import { ChatMessageEmptyComponent } from '../chat-message-empty';
import { ChatMessageOutComponent } from '../chat-message-out';
import {
  CHAT_SERVICE_TOKEN,
  ChatMessageListRegistryService,
  CUSTOM_CONTACT_FACTORY_TOKEN,
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
  selector: 'ngx-chat-history-messages-room',
  templateUrl: './chat-history-messages-room.component.html',
  styleUrls: ['./chat-history-messages-room.component.less'],
})
export class ChatHistoryMessagesRoomComponent implements OnInit, OnDestroy {
  @Input()
  room!: Room;

  @Input()
  showAvatars = true;

  private ngDestroySubject = new Subject<void>();
  private messagesGroupedByDateSubject = new ReplaySubject<
    { date: Date; messagesWithContact: { message: Message; contact: Contact }[] }[]
  >(1);

  // can not render two components with the same recipient example index.html and in chat-window, waisted time 8h
  messagesGroupedByDate$: Observable<
    { date: Date; messagesWithContact: { message: Message; contact: Contact }[] }[]
  > = this.messagesGroupedByDateSubject.asObservable();

  Direction = Direction;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) public chatMessageListRegistry: ChatMessageListRegistryService,
    @Inject(CUSTOM_CONTACT_FACTORY_TOKEN) public contactFactory: CustomContactFactory,
    readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.room.messageStore.messages$
      .pipe(
        mergeMap(async (messages) => {
          messages.sort((a, b) => a?.datetime?.getTime() - b?.datetime?.getTime());
          const messageMap = new Map<string, { message: Message; contact: Contact }[]>();
          for (const message of messages) {
            const key = message.datetime.toDateString();

            if (!message) {
              throw new Error('message is undefined');
            }

            if (!message.from) {
              throw new Error('message.from is undefined');
            }

            const from = message.from.toString();
            const contact = await this.contactFactory.create(
              from,
              from.split('@')[0] as string,
              undefined,
              undefined
            );

            if (!contact) {
              throw new Error('contact is undefined');
            }

            const messageWithContact = { message, contact };
            if (messageMap.has(key)) {
              messageMap.get(key)?.push(messageWithContact);
            } else {
              messageMap.set(key, [messageWithContact]);
            }
          }

          const returnArray = new Array<{
            date: Date;
            messagesWithContact: { message: Message; contact: Contact }[];
          }>();

          for (const [key, mapMessages] of messageMap) {
            returnArray.push({ date: new Date(key), messagesWithContact: mapMessages });
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

  getNickFromContact(contact: Contact): string | undefined {
    return contact.jid.resource;
  }
}

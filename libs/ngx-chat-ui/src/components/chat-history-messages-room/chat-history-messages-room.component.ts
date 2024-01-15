// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChangeDetectorRef, Component, Inject, Input } from '@angular/core';
import { mergeMap, Observable, tap } from 'rxjs';
import type { ChatService } from '@pazznetwork/ngx-chat-shared';
import {
  Contact,
  ContactSubscription,
  CustomContactFactory,
  Direction,
  Message,
} from '@pazznetwork/ngx-chat-shared';
import { ChatMessageInComponent } from '../chat-message-in';
import { CommonModule } from '@angular/common';
import { ChatMessageOutComponent } from '../chat-message-out';
import { CHAT_SERVICE_TOKEN, CUSTOM_CONTACT_FACTORY_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
  standalone: true,
  imports: [CommonModule, ChatMessageInComponent, ChatMessageOutComponent],
  selector: 'ngx-chat-history-messages-room',
  templateUrl: './chat-history-messages-room.component.html',
  styleUrls: ['./chat-history-messages-room.component.less'],
})
export class ChatHistoryMessagesRoomComponent {
  @Input()
  set messages$(value$: Observable<Message[]> | undefined) {
    if (value$ == null) {
      throw new Error('ngx-chat-history-messages-room: messages$ input is null or undefined');
    }

    this.messagesGroupedByDate$ = value$.pipe(
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

          const contact = await this.customContactFactory.create(
            message.from.toString(),
            message.from?.local?.toString() ?? '',
            undefined,
            ContactSubscription.none
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
      tap(() => setTimeout(() => this.cdr.detectChanges(), 0))
    );
  }

  @Input()
  showAvatars = true;

  messagesGroupedByDate$?: Observable<
    { date: Date; messagesWithContact: { message: Message; contact: Contact }[] }[]
  >;
  Direction = Direction;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
    @Inject(CUSTOM_CONTACT_FACTORY_TOKEN)
    private readonly customContactFactory: CustomContactFactory,
    private readonly cdr: ChangeDetectorRef
  ) {}

  getNickFromContact(contact: Contact): string | undefined {
    return contact.name ?? contact.jid.resource;
  }
}

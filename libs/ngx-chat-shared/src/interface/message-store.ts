// SPDX-License-Identifier: AGPL-3.0-or-later
import { ReplaySubject, startWith } from 'rxjs';
import { Direction, type Message } from './message';
import { findLast, insertSortedLast } from '../utils-array';

export class MessageStore {
  readonly messages: Message[] = [];
  private readonly messagesSubject = new ReplaySubject<Message[]>(1);
  readonly messages$ = this.messagesSubject.pipe(startWith(this.messages));
  readonly messageIdToMessage = new Map<string, Message>();

  get oldestMessage(): Message | undefined {
    return this.messages[0];
  }

  get mostRecentMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  get mostRecentMessageReceived(): Message | undefined {
    return findLast(this.messages, (msg) => msg.direction === Direction.in);
  }

  get mostRecentMessageSent(): Message | undefined {
    return findLast(this.messages, (msg) => msg.direction === Direction.out);
  }

  addMessage(message: Message): void {
    if (this.messageIdToMessage.has(message.id)) {
      // as we are querying for messages in the past, we might get duplicate messages
      return;
    }

    if (
      this.mostRecentMessage?.datetime == null ||
      message.datetime > this.mostRecentMessage?.datetime
    ) {
      this.messages.push(message);
    } else {
      insertSortedLast(message, this.messages, (m) => m.datetime);
    }
    this.messageIdToMessage.set(message.id, message);
    this.messagesSubject.next(this.messages);
  }
}

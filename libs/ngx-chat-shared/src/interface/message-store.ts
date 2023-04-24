// SPDX-License-Identifier: AGPL-3.0-or-later
import { ReplaySubject } from 'rxjs';
import { Direction, Message } from './message';
import { findLast, insertSortedLast } from '../utils-array';

export class MessageStore {
  private readonly messagesSubject = new ReplaySubject<Message[]>(1);
  readonly messages$ = this.messagesSubject.asObservable();
  readonly messages: Message[] = [];
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
      // eslint-disable-next-line no-console
      console.warn(`message with id ${message.id} already exists`);
    }
    if (this.mostRecentMessage?.datetime && message.datetime > this.mostRecentMessage?.datetime) {
      this.messages.push(message);
    } else {
      insertSortedLast(message, this.messages, (m) => m.datetime);
    }
    this.messageIdToMessage.set(message.id, message);
    this.messagesSubject.next(this.messages);
  }
}

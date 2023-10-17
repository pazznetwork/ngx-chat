// SPDX-License-Identifier: AGPL-3.0-or-later
import { connectable, ReplaySubject, startWith } from 'rxjs';
import { Direction, type Message } from './message';
import { findLast, insertSortedLast } from '../utils-array';

export class MessageStore {
  readonly messages: Message[] = [];
  private readonly messagesSubject = new ReplaySubject<Message[]>(1);
  readonly messages$ = connectable(this.messagesSubject.pipe(startWith(this.messages)));
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static create(): MessageStore {
    const messageStore = new MessageStore();
    messageStore.messages$.connect();
    return messageStore;
  }

  addMessage(message: Message): void {
    if (!this.mostRecentMessage?.datetime || message.datetime > this.mostRecentMessage?.datetime) {
      this.messages.push(message);
    } else {
      insertSortedLast(message, this.messages, (m) => m.datetime);
    }
    this.messageIdToMessage.set(message.id, message);
    this.messagesSubject.next(this.messages);
  }
}

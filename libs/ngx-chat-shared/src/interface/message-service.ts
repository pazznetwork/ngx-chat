// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Observable } from 'rxjs';
import type { Recipient } from './recipient';
import type { JidToNumber } from './jid-to-number';
import type { Message, MessageState } from './message';

export interface MessageService {
  /**
   * Will emit the corresponding contact when a new message arrive.
   */
  message$: Observable<Recipient>;

  /**
   * Observable representing the stream of "messageReceived" events.
   *
   * @typedef {import("rxjs").Observable<Recipient>} messageReceived$
   */
  messageReceived$: Observable<Recipient>;

  /**
   * Represents an Observable that emits the details of a message being sent to a recipient.
   *
   * @typedef {Observable<Recipient>} messageSent$
   */
  messageSent$: Observable<Recipient>;

  /**
   * emits as soon as the unread message count changes, you might want to debounce it with e.g. half a second, as
   * new messages might be acknowledged in another session.
   */
  jidToUnreadCount$: Observable<JidToNumber>;

  unreadMessageCountSum$: Observable<number>;

  /**
   * Sends a given message to a given contact.
   *
   * @param recipient The recipient to which the message shall be sent.
   * @param body The message content.
   */
  sendMessage(recipient: Recipient, body: string): Promise<void>;

  /**
   * Requests all archived messages for all contacts from the server.
   */
  loadCompleteHistory(): Promise<void>;

  loadMessagesBeforeOldestMessage(recipient: Recipient): Promise<void>;

  loadMostRecentMessages(recipient: Recipient): Promise<void>;

  getContactMessageState(message: Message, contactJid: string): MessageState;
}

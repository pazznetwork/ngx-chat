// SPDX-License-Identifier: AGPL-3.0-or-later
import { BehaviorSubject, Subject } from 'rxjs';
import type { OpenChatsService, Recipient } from '@pazznetwork/ngx-chat-shared';

/**
 * Used to determine if a message component for a given recipient is open.
 */
export class ChatMessageListRegistryService implements OpenChatsService {
  private openChatsSubject = new BehaviorSubject<Set<Recipient>>(new Set());
  openChats$ = this.openChatsSubject.asObservable();
  private chatOpenedSubject = new Subject<Recipient>();
  chatOpened$ = this.chatOpenedSubject.asObservable();

  private chatMessagesViewedSubject = new Subject<Recipient>();
  chatMessagesViewed$ = this.chatMessagesViewedSubject.asObservable();
  recipientToOpenMessageListCount = new Map<Recipient, number>();

  isChatOpen(recipient: Recipient): boolean {
    return this.getOrDefault(recipient, 0) > 0;
  }

  viewedChatMessages(recipient: Recipient): void {
    this.chatMessagesViewedSubject.next(recipient);
  }

  incrementOpenWindowCount(recipient: Recipient): void {
    const wasWindowOpen = this.isChatOpen(recipient);
    this.recipientToOpenMessageListCount.set(recipient, this.getOrDefault(recipient, 0) + 1);
    const openWindowSet = this.openChatsSubject.getValue();
    openWindowSet.add(recipient);
    this.openChatsSubject.next(openWindowSet);
    if (!wasWindowOpen) {
      this.chatOpenedSubject.next(recipient);
    }
  }

  decrementOpenWindowCount(recipient: Recipient): void {
    const newValue = this.getOrDefault(recipient, 0) - 1;
    if (newValue <= 0) {
      this.recipientToOpenMessageListCount.set(recipient, 0);
      const openWindowSet = this.openChatsSubject.getValue();
      openWindowSet.delete(recipient);
      this.openChatsSubject.next(openWindowSet);
    } else {
      this.recipientToOpenMessageListCount.set(recipient, newValue);
    }
  }

  getOrDefault(recipient: Recipient, defaultValue: number): number {
    return this.recipientToOpenMessageListCount.get(recipient) || defaultValue;
  }
}

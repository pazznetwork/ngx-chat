// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Observable } from 'rxjs';
import type { Recipient } from './recipient';

export interface OpenChatsService {
  openChats$: Observable<Set<Recipient>>;
  chatOpened$: Observable<Recipient>;
  chatMessagesViewed$: Observable<Recipient>;
  recipientToOpenMessageListCount: Map<Recipient, number>;

  isChatOpen(recipient: Recipient): boolean;

  incrementOpenWindowCount(recipient: Recipient): void;

  decrementOpenWindowCount(recipient: Recipient): void;

  getOrDefault(recipient: Recipient, defaultValue: number): any;
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { CHAT_SERVICE_TOKEN } from '../injection-token';

export class ChatWindowState {
  constructor(readonly recipient: Recipient, public isCollapsed: boolean) {}
}

export interface AttachableTrack {
  attach(elem: HTMLVideoElement): void;
}

/**
 * Used to open chat windows programmatically.
 */
@Injectable()
export class ChatListStateService {
  private openChatsSubject = new BehaviorSubject<ChatWindowState[]>([]);
  private openTracksSubject = new BehaviorSubject<AttachableTrack[]>([]);
  openChats$ = this.openChatsSubject.asObservable();
  openTracks$ = this.openTracksSubject.asObservable();

  constructor(@Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService) {
    this.chatService.onOffline$.subscribe(() => {
      this.openChatsSubject.next([]);
    });

    this.chatService.contactListService.contactRequestsReceived$.subscribe((contacts) => {
      for (const contact of contacts) {
        this.openChat(contact);
      }
    });
  }

  openChat(recipient: Recipient, collapsedWindow = false): void {
    if (this.isChatWithRecipientOpen(recipient)) {
      return;
    }
    const openChats = this.openChatsSubject.getValue();
    const chatWindow = new ChatWindowState(recipient, collapsedWindow);
    this.openChatsSubject.next([chatWindow].concat(openChats));
  }

  closeChat(recipient: Recipient): void {
    const openChats = this.openChatsSubject.getValue();
    const index = this.findChatWindowStateIndexByRecipient(recipient);
    if (index >= 0) {
      const copyWithoutContact = openChats.slice();
      copyWithoutContact.splice(index, 1);
      this.openChatsSubject.next(copyWithoutContact);
    }
  }

  openTrack(track: AttachableTrack): void {
    this.openTracksSubject.next(this.openTracksSubject.getValue().concat([track]));
  }

  closeTrack(track: AttachableTrack): void {
    this.openTracksSubject.next(this.openTracksSubject.getValue().filter((s) => s !== track));
  }

  isChatWithRecipientOpen(recipient: Recipient): boolean {
    return this.findChatWindowStateByRecipient(recipient) !== undefined;
  }

  private findChatWindowStateIndexByRecipient(recipient: Recipient): number {
    return this.openChatsSubject
      .getValue()
      .findIndex((chatWindowState) => chatWindowState.recipient.equalsJid(recipient));
  }

  private findChatWindowStateByRecipient(recipient: Recipient): ChatWindowState | undefined {
    return this.openChatsSubject.getValue().find((chat) => chat.recipient.equalsJid(recipient));
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { CHAT_SERVICE_TOKEN } from '../injection-token';
import { filter, map, shareReplay } from 'rxjs/operators';

interface ChatWindowState {
  recipient: Recipient;
  isCollapsed: boolean;
}

export interface AttachableTrack {
  attach(elem: HTMLVideoElement): void;
}

/**
 * Used to open chat windows programmatically.
 */
@Injectable()
export class ChatListStateService {
  private readonly openChatSubject = new Subject<ChatWindowState>();
  private readonly closeChatSubject = new Subject<string>();
  private readonly openChatsMap = new Map<string, ChatWindowState>();
  readonly openChats$: Observable<ChatWindowState[]>;

  private openTracksSubject = new BehaviorSubject<AttachableTrack[]>([]);
  readonly openTracks$ = this.openTracksSubject.asObservable();

  constructor(@Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService) {
    this.openChats$ = merge(
      this.openChatSubject.pipe(
        filter((state) => !this.openChatsMap.has(state.recipient.jid.bare().toString())),
        map((state: ChatWindowState) => {
          this.openChatsMap.set(state.recipient.jid.bare().toString(), state);
          return this.openChatsMap;
        })
      ),
      this.closeChatSubject.pipe(
        map((recipientJid) => {
          this.openChatsMap.delete(recipientJid);
          return this.openChatsMap;
        })
      ),
      this.chatService.onOffline$.pipe(
        map(() => {
          this.openChatsMap.clear();
          return this.openChatsMap;
        })
      )
    ).pipe(
      map((contactMap) => Array.from(contactMap.values())),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  openChat(recipient: Recipient, isCollapsed = false): void {
    this.openChatSubject.next({ recipient, isCollapsed });
  }

  closeChat(recipient: Recipient): void {
    this.closeChatSubject.next(recipient.jid.bare().toString());
  }

  openTrack(track: AttachableTrack): void {
    this.openTracksSubject.next(this.openTracksSubject.getValue().concat([track]));
  }

  closeTrack(track: AttachableTrack): void {
    this.openTracksSubject.next(this.openTracksSubject.getValue().filter((s) => s !== track));
  }
}

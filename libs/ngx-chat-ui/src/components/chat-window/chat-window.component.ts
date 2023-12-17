// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { merge, Observable, scan, startWith, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { type ChatService, Direction, Recipient } from '@pazznetwork/ngx-chat-shared';
import {
  CHAT_SERVICE_TOKEN,
  ChatListStateService,
  ChatMessageListRegistryService,
  OPEN_CHAT_SERVICE_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import { CommonModule } from '@angular/common';
import { ChatWindowFrameComponent } from '../chat-window-frame';
import { ChatWindowHeaderComponent } from '../chat-window-header';
import { ChatWindowContentComponent } from '../chat-window-content';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    XmppAdapterModule,
    ChatWindowFrameComponent,
    ChatWindowHeaderComponent,
    ChatWindowContentComponent,
  ],
  selector: 'ngx-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.less'],
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @Input()
  recipient!: Recipient;

  @Input()
  isCollapsed!: boolean;

  isWindowOpen$?: Observable<boolean>;

  private readonly headerClickedSubject = new Subject<void>();

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) public chatMessageListRegistry: ChatMessageListRegistryService,
    private readonly chatListService: ChatListStateService
  ) {}

  ngOnInit(): void {
    const openOnInit$ = this.recipient.messageStore.messages$.pipe(
      filter(
        (messages) => messages.findIndex((message) => message.direction === Direction.in) > -1
      ),
      map(() => true)
    );

    const toggleOpen$ = this.headerClickedSubject.pipe(
      startWith(!this.isCollapsed),
      scan((toggle) => !toggle, false)
    );
    this.isWindowOpen$ = merge(openOnInit$, toggleOpen$);
    this.chatMessageListRegistry.incrementOpenWindowCount(this.recipient);
  }

  ngOnDestroy(): void {
    this.chatMessageListRegistry.decrementOpenWindowCount(this.recipient);
  }

  onClickHeader(): void {
    this.headerClickedSubject.next();
  }

  onClickClose(): void {
    this.chatListService.closeChat(this.recipient);
  }
}

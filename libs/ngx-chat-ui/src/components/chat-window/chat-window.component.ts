// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { merge, Observable, scan, startWith, Subject } from 'rxjs';
import {
  type ChatService,
  Direction,
  OpenChatsService,
  OpenChatStateService,
  Recipient,
} from '@pazznetwork/ngx-chat-shared';
import {
  CHAT_LIST_STATE_SERVICE_TOKEN,
  CHAT_SERVICE_TOKEN,
  OPEN_CHAT_SERVICE_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import { CommonModule } from '@angular/common';
import { ChatWindowFrameComponent } from '../chat-window-frame';
import { ChatWindowHeaderComponent } from '../chat-window-header';
import { ChatWindowContentComponent } from '../chat-window-content';
import { filter, map } from 'rxjs/operators';

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
  currentRecipient!: Recipient;

  @Input()
  set recipient(value: Recipient) {
    const openOnInit$ = value.messageStore.messages$.pipe(
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

    this.currentRecipient = value;
  }

  @Input()
  isCollapsed!: boolean;

  isWindowOpen$?: Observable<boolean>;

  private readonly headerClickedSubject = new Subject<void>();

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(OPEN_CHAT_SERVICE_TOKEN) public openChatsService: OpenChatsService,
    @Inject(CHAT_LIST_STATE_SERVICE_TOKEN)
    private readonly openChatStateService: OpenChatStateService
  ) {}

  ngOnInit(): void {
    this.openChatsService.incrementOpenWindowCount(this.currentRecipient);
  }

  ngOnDestroy(): void {
    this.openChatsService.decrementOpenWindowCount(this.currentRecipient);
  }

  onClickHeader(): void {
    this.headerClickedSubject.next();
  }

  onClickClose(): void {
    this.openChatStateService.closeChat(this.currentRecipient);
  }
}

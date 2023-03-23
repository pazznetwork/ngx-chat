// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { merge, Observable, scan, Subject } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import { type ChatService, Direction } from '@pazznetwork/ngx-chat-shared';
import {
  CHAT_SERVICE_TOKEN,
  ChatListStateService,
  ChatWindowState,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @Input()
  chatWindowState?: ChatWindowState;

  isWindowOpen$?: Observable<boolean>;

  private readonly headerClickedSubject = new Subject<void>();

  private readonly ngDestroySubject = new Subject<void>();

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    private readonly chatListService: ChatListStateService
  ) {}

  ngOnInit(): void {
    if (!this.chatWindowState) {
      return;
    }

    const openOnInit$ = this.chatWindowState.recipient.messageStore.messages$.pipe(
      filter(
        (messages) => messages.findIndex((message) => message.direction === Direction.in) > -1
      ),
      map(() => true),
      takeUntil(this.ngDestroySubject)
    );

    const toggleOpen$ = this.headerClickedSubject.pipe(scan((toggle) => !toggle, false));
    this.isWindowOpen$ = merge(openOnInit$, toggleOpen$);
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
    this.ngDestroySubject.complete();
  }

  onClickHeader(): void {
    this.headerClickedSubject.next();
  }

  onClickClose(): void {
    if (!this.chatWindowState) {
      return;
    }
    this.chatListService.closeChat(this.chatWindowState.recipient);
  }
}

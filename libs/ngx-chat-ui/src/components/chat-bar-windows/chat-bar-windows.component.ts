// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ChatVideoWindowComponent } from '../chat-video-window';
import { ChatWindowComponent } from '../chat-window';
import { CHAT_LIST_STATE_SERVICE_TOKEN, CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { merge, mergeMap, Observable, Subject, throttleTime } from 'rxjs';
import {
  AttachableTrack,
  ChatService,
  Contact,
  OpenChatStateService,
  Recipient,
  Room,
} from '@pazznetwork/ngx-chat-shared';
import { filter, map, pairwise, startWith, takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, ChatVideoWindowComponent, ChatWindowComponent],
  selector: 'ngx-chat-bar-windows',
  templateUrl: './chat-bar-windows.component.html',
  styleUrls: ['./chat-bar-windows.component.less'],
  animations: [
    trigger('rosterVisibility', [
      state(
        'hidden',
        style({
          right: '1em',
        })
      ),
      state(
        'shown',
        style({
          right: '15em',
        })
      ),
      transition('hidden => shown', animate('400ms ease')),
      transition('shown => hidden', animate('400ms ease')),
    ]),
  ],
})
export class ChatBarWindowsComponent implements OnInit, OnDestroy {
  @Input()
  rosterState?: 'hidden' | 'shown';

  @Input()
  contacts$?: Observable<Contact[]>;

  @Input()
  rooms$?: Observable<Room[]>;

  chats$: Observable<{ recipient: Recipient; isCollapsed: boolean }[]>;
  readonly tracks$: Observable<AttachableTrack[]>;

  private readonly ngDestroySubject = new Subject<void>();

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService,
    @Inject(CHAT_LIST_STATE_SERVICE_TOKEN)
    readonly chatListService: OpenChatStateService
  ) {
    this.tracks$ = this.chatListService.openTracks$;
    this.chats$ = this.chatListService.openChats$;
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }

  ngOnInit(): void {
    // Moved from chat-list-state.service to avoid expression changed after checked error
    // when the ui lib user provides a modified recipients for example for custom avatars
    merge(
      this.contacts$ ?? this.chatService.contactListService.contacts$,
      this.rooms$ ?? this.chatService.roomService.rooms$
    )
      .pipe(
        startWith(new Array<Recipient>()),
        pairwise(),
        filter(([prev, next]) => prev.length < next.length),
        map(([prev, next]) =>
          next.filter((nc) => !prev.find((pc) => pc.jid.local === nc.jid.local))
        ),
        mergeMap((contacts) => contacts),
        throttleTime(5000),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe((contact) => this.chatListService.openChat(contact, false));

    merge(
      this.contacts$ ?? this.chatService.contactListService.contacts$,
      this.rooms$ ?? this.chatService.roomService.rooms$
    )
      .pipe(
        startWith(new Array<Recipient>()),
        pairwise(),
        filter(([prev, next]) => prev.length > next.length),
        map(([prev, next]) =>
          prev.filter((pc) => !next.find((nc) => pc.jid.local === nc.jid.local))
        ),
        mergeMap((contacts) => contacts),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe((contact) => this.chatListService.closeChat(contact));
  }
}

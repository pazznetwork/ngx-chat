// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { ChatVideoWindowComponent } from '../chat-video-window';
import { ChatWindowComponent } from '../chat-window';
import { CHAT_LIST_STATE_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { Observable } from 'rxjs';
import {
  AttachableTrack,
  Contact,
  OpenChatStateService,
  Recipient,
  Room,
} from '@pazznetwork/ngx-chat-shared';

@Component({
    imports: [CommonModule, ChatVideoWindowComponent, ChatWindowComponent],
    selector: 'ngx-chat-bar-windows',
    templateUrl: './chat-bar-windows.component.html',
    styleUrls: ['./chat-bar-windows.component.less'],
    animations: [
        trigger('rosterVisibility', [
            state('hidden', style({
                right: '1em',
            })),
            state('shown', style({
                right: '15em',
            })),
            transition('hidden => shown', animate('400ms ease')),
            transition('shown => hidden', animate('400ms ease')),
        ]),
    ]
})
export class ChatBarWindowsComponent {
  @Input()
  rosterState?: 'hidden' | 'shown';

  @Input()
  contacts$?: Observable<Contact[]>;

  @Input()
  rooms$?: Observable<Room[]>;

  chats$: Observable<{ recipient: Recipient; isCollapsed: boolean }[]>;
  readonly tracks$: Observable<AttachableTrack[]>;

  constructor(
    @Inject(CHAT_LIST_STATE_SERVICE_TOKEN)
    readonly chatListService: OpenChatStateService
  ) {
    this.tracks$ = this.chatListService.openTracks$;
    this.chats$ = this.chatListService.openChats$;
  }
}

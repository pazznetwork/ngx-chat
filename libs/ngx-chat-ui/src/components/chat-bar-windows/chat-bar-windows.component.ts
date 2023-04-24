// SPDX-License-Identifier: AGPL-3.0-or-later
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ChatVideoWindowComponent } from '../chat-video-window';
import { ChatWindowComponent } from '../chat-window';
import { ChatListStateService } from '@pazznetwork/ngx-xmpp';

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
export class ChatBarWindowsComponent {
  @Input()
  rosterState?: string;

  constructor(public chatListService: ChatListStateService) {}
}

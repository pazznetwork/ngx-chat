// SPDX-License-Identifier: AGPL-3.0-or-later
import { Observable } from 'rxjs';
import type { Recipient } from '@pazznetwork/ngx-chat-shared';

export interface ChatWindowState {
  recipient: Recipient;
  isCollapsed: boolean;
}

export interface AttachableTrack {
  attach(elem: HTMLVideoElement): void;
}

export interface OpenChatStateService {
  readonly openChats$: Observable<ChatWindowState[]>;
  readonly openTracks$: Observable<AttachableTrack[]>;

  openChat(recipient: Recipient, isCollapsed: boolean): void;

  closeChat(recipient: Recipient): void;

  openTrack(track: AttachableTrack): void;

  closeTrack(track: AttachableTrack): void;
}

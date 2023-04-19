// SPDX-License-Identifier: AGPL-3.0-or-later
import { NgModule } from '@angular/core';
import {
  ChatAvatarComponent,
  ChatBubbleAvatarComponent,
  ChatBubbleComponent,
  ChatBubbleFooterComponent,
  ChatComponent,
  ChatFileDropComponent,
  ChatHistoryComponent,
  ChatMessageContactRequestComponent,
  ChatMessageEmptyComponent,
  ChatMessageImageComponent,
  ChatMessageInComponent,
  ChatMessageOutComponent,
  ChatMessageRoomInviteComponent,
  ChatMessageStateIconComponent,
  ChatMessageTextAreaComponent,
  ChatVideoWindowComponent,
  ChatWindowContentComponent,
  ChatWindowFrameComponent,
  ChatWindowHeaderComponent,
  ChatWindowInputComponent,
  RosterListComponent,
  RosterRecipientComponent,
} from './components';
import { XmppAdapterModule } from '@pazznetwork/ngx-xmpp';

@NgModule({
  imports: [
    ChatAvatarComponent,
    ChatBubbleAvatarComponent,
    ChatBubbleFooterComponent,
    ChatBubbleComponent,
    ChatComponent,
    ChatFileDropComponent,
    ChatHistoryComponent,
    ChatMessageContactRequestComponent,
    ChatMessageEmptyComponent,
    ChatMessageImageComponent,
    ChatMessageInComponent,
    ChatMessageOutComponent,
    ChatMessageRoomInviteComponent,
    ChatMessageStateIconComponent,
    ChatMessageTextAreaComponent,
    ChatVideoWindowComponent,
    ChatWindowContentComponent,
    ChatWindowFrameComponent,
    ChatWindowHeaderComponent,
    ChatWindowInputComponent,
    RosterListComponent,
    RosterRecipientComponent,
    XmppAdapterModule,
  ],
  exports: [
    ChatAvatarComponent,
    ChatBubbleAvatarComponent,
    ChatBubbleFooterComponent,
    ChatBubbleComponent,
    ChatComponent,
    ChatFileDropComponent,
    ChatHistoryComponent,
    ChatMessageContactRequestComponent,
    ChatMessageEmptyComponent,
    ChatMessageImageComponent,
    ChatMessageInComponent,
    ChatMessageOutComponent,
    ChatMessageRoomInviteComponent,
    ChatMessageStateIconComponent,
    ChatMessageTextAreaComponent,
    ChatVideoWindowComponent,
    ChatWindowContentComponent,
    ChatWindowFrameComponent,
    ChatWindowHeaderComponent,
    ChatWindowInputComponent,
    RosterListComponent,
    RosterRecipientComponent,
  ],
})
export class NgxChatModule {}
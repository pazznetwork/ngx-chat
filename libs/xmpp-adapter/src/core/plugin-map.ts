// SPDX-License-Identifier: MIT
import type {
  BlockPlugin,
  BookmarkPlugin,
  EntityTimePlugin,
  MessageArchivePlugin,
  MessageCarbonsPlugin,
  MessageUuidPlugin,
  MucSubPlugin,
  MultiUserChatPlugin,
  PingPlugin,
  PublishSubscribePlugin,
  PushPlugin,
  RosterPlugin,
  ServiceDiscoveryPlugin,
  XmppHttpFileUploadHandler,
} from '../plugins';
import type { UnreadMessageCountService } from '../service';

export interface PluginMap {
  muc: MultiUserChatPlugin;
  block: BlockPlugin;
  bookmark: BookmarkPlugin;
  entityTime: EntityTimePlugin;
  mam: MessageArchivePlugin;
  messageCarbon: MessageCarbonsPlugin;
  // messageState: MessageStatePlugin; // todo implement xmpp message state
  messageUuid: MessageUuidPlugin;
  mucSub: MucSubPlugin;
  ping: PingPlugin;
  pubSub: PublishSubscribePlugin;
  push: PushPlugin;
  roster: RosterPlugin;
  disco: ServiceDiscoveryPlugin;
  unreadMessageCount: UnreadMessageCountService;
  xmppFileUpload: XmppHttpFileUploadHandler;
}

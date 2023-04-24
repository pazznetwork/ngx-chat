// SPDX-License-Identifier: MIT
import {
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
import { UnreadMessageCountService } from '../service';
import type { XmppService } from '../xmpp.service';
import type { HttpClient } from '@angular/common/http';
import type { Log, OpenChatsService } from '@pazznetwork/ngx-chat-shared';
import type { PluginMap } from './plugin-map';

export function createPluginMap(
  xmppService: XmppService,
  httpClient: HttpClient,
  logService: Log,
  openChatsService: OpenChatsService
): PluginMap {
  const serviceDiscoveryPlugin = new ServiceDiscoveryPlugin(xmppService);
  const publishSubscribePlugin = new PublishSubscribePlugin(xmppService);
  const entityTime = new EntityTimePlugin(xmppService, logService);
  const multiUserChatPlugin = new MultiUserChatPlugin(
    xmppService,
    logService,
    serviceDiscoveryPlugin
  );

  const block = new BlockPlugin(xmppService);
  const unreadMessageCount = new UnreadMessageCountService(
    xmppService,
    openChatsService,
    publishSubscribePlugin,
    multiUserChatPlugin,
    block
  );

  const uploadServicePromise =
    XmppHttpFileUploadHandler.getUploadServiceThroughServiceDiscovery(serviceDiscoveryPlugin);

  return {
    muc: multiUserChatPlugin,
    block,
    bookmark: new BookmarkPlugin(xmppService),
    entityTime,
    mam: new MessageArchivePlugin(xmppService, logService),
    messageCarbon: new MessageCarbonsPlugin(xmppService),
    /*    messageState: new MessageStatePlugin(
      publishSubscribePlugin,
      xmppService,
      openChatsService,
      logService
    ),*/
    messageUuid: new MessageUuidPlugin(),
    mucSub: new MucSubPlugin(xmppService, serviceDiscoveryPlugin),
    ping: new PingPlugin(xmppService),
    pubSub: publishSubscribePlugin,
    push: new PushPlugin(xmppService, serviceDiscoveryPlugin),
    roster: new RosterPlugin(xmppService),
    disco: serviceDiscoveryPlugin,
    unreadMessageCount,
    xmppFileUpload: new XmppHttpFileUploadHandler(httpClient, xmppService, uploadServicePromise),
  };
}

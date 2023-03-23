// SPDX-License-Identifier: MIT
import type { XmppService } from '../xmpp.service';
import type { Service, ServiceDiscoveryPlugin } from './service-discovery.plugin';
import type { ChatPlugin, IqResponseStanza } from '../core';

const nsPush = 'urn:xmpp:push:0';

/**
 * xep-0357
 */
export class PushPlugin implements ChatPlugin {
  nameSpace = nsPush;

  constructor(
    private xmppChatAdapter: XmppService,
    private serviceDiscoveryPlugin: ServiceDiscoveryPlugin
  ) {}

  async register(node: string, jid?: string): Promise<IqResponseStanza<'result'>> {
    if (!jid) {
      const service = await this.getPushServiceComponent();
      jid = service.jid;
    }
    return this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set' })
      .c('enable', { xmlns: this.nameSpace, jid, node })
      .send();
  }

  private async getPushServiceComponent(): Promise<Service> {
    return this.serviceDiscoveryPlugin.findService('pubsub', 'push');
  }

  async unregister(node?: string, jid?: string): Promise<IqResponseStanza<'result'>> {
    if (!jid) {
      const service = await this.getPushServiceComponent();
      jid = service.jid;
    }
    return this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set' })
      .c('disable', { xmlns: this.nameSpace, jid, ...(node ? { node } : {}) })
      .send();
  }
}

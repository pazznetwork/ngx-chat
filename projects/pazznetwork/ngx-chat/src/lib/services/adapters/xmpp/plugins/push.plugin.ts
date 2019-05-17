import { x as xml } from '@xmpp/xml';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

/**
 * xep-0357
 */
export class PushPlugin extends AbstractXmppPlugin {

    constructor(private xmppChatAdapter: XmppChatAdapter,
                private serviceDiscoveryPlugin: ServiceDiscoveryPlugin) {
        super();
    }

    async register(node: string, jid?: string): Promise<any> {
        if (!jid) {
            const service = await this.getPushServiceComponent();
            jid = service.jid;
        }
        return await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('enable', {xmlns: 'urn:xmpp:push:0', jid, node})
            )
        );
    }

    private async getPushServiceComponent() {
        return await this.serviceDiscoveryPlugin.findService('pubsub', 'push');
    }

    async unregister(node?: string, jid?: string): Promise<any> {
        if (!jid) {
            const service = await this.getPushServiceComponent();
            jid = service.jid;
        }
        return await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('disable', {xmlns: 'urn:xmpp:push:0', jid, node})
            )
        );
    }

}

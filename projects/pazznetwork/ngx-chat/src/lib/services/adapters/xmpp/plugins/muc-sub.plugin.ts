import { xml } from '@xmpp/client';
import { BehaviorSubject } from 'rxjs';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

/**
 * support for https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/
 */
export class MucSubPlugin extends AbstractXmppPlugin {

    private supportsMucSub = new BehaviorSubject<boolean | 'unknown'>('unknown');

    constructor(
        private xmppChatAdapter: XmppChatAdapter,
        private serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
    ) {
        super();
    }

    onBeforeOnline(): PromiseLike<void> {
        return this.determineSupportForMucSub();
    }

    private async determineSupportForMucSub() {
        let isSupported: boolean;
        try {
            const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');
            isSupported = service.features.indexOf('urn:xmpp:mucsub:0') > -1;
        } catch (e) {
            isSupported = false;
        }
        this.supportsMucSub.next(isSupported);
    }

    onOffline() {
        this.supportsMucSub.next('unknown');
    }

    subscribeRoom(roomJid: string) {
        const nick = this.xmppChatAdapter.chatConnectionService.userJid.local;
        this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set', to: roomJid},
                xml('subscribe', {xmlns: 'urn:xmpp:mucsub:0', nick})
            )
        );
    }

}

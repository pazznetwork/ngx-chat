import { xml } from '@xmpp/client';
import { BehaviorSubject } from 'rxjs';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';
import { Stanza } from '../../../../core/stanza';

export const MUC_SUB_FEATURE_ID = 'urn:xmpp:mucsub:0';

export enum MUC_SUB_EVENT_TYPE {
    presence = 'urn:xmpp:mucsub:nodes:presence',
    messages = 'urn:xmpp:mucsub:nodes:messages',
    affiliations = 'urn:xmpp:mucsub:nodes:affiliations',
    subscribers = 'urn:xmpp:mucsub:nodes:subscribers',
    config = 'urn:xmpp:mucsub:nodes:config',
    subject = 'urn:xmpp:mucsub:nodes:subject',
    system = 'urn:xmpp:mucsub:nodes:system',
}

/**
 * support for https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/
 */
export class MucSubPlugin extends AbstractXmppPlugin {
    private readonly supportsMucSub$ = new BehaviorSubject<boolean | 'unknown'>('unknown');

    constructor(
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
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
            isSupported = service.features.includes(MUC_SUB_FEATURE_ID);
        } catch (e) {
            isSupported = false;
        }
        this.supportsMucSub$.next(isSupported);
    }

    onOffline() {
        this.supportsMucSub$.next('unknown');
    }

    async subscribeRoom(roomJid: string, nodes: string[] = []): Promise<void> {
        const nick = this.xmppChatAdapter.chatConnectionService.userJid.local;
        await this.xmppChatAdapter.chatConnectionService.sendIq(
            makeSubscribeRoomStanza(roomJid, nick, nodes)
        );
    }

    async unsubscribeRoom(roomJid: string): Promise<void> {
        await this.xmppChatAdapter.chatConnectionService.sendIq(
            makeUnsubscribeRoomStanza(roomJid)
        );
    }

    async retrieveSubscriptions(): Promise<Map<string, string[]>> {
        const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');

        const result = await this.xmppChatAdapter.chatConnectionService.sendIq(
            makeRetrieveSubscriptionsStanza(service.jid)
        );

        const subscriptions = result
            .getChild('subscriptions', MUC_SUB_FEATURE_ID)
            ?.getChildren('subscription')
            ?.map(subscriptionElement => {
                const subscribedEvents: string[] = subscriptionElement
                    .getChildren('event')
                    ?.map(eventElement => eventElement.attrs.node) ?? [];
                return [subscriptionElement.attrs.jid as string, subscribedEvents] as const;
            });

        return new Map(subscriptions);
    }
}

function makeSubscribeRoomStanza(roomJid: string, nick: string, nodes: readonly string[]): Stanza {
    return xml('iq', {type: 'set', to: roomJid},
        xml('subscribe', {xmlns: MUC_SUB_FEATURE_ID, nick},
            nodes.map(node => xml('event', {node}))
        )
    );
}

function makeUnsubscribeRoomStanza(roomJid: string): Stanza {
    return xml('iq', {type: 'set', to: roomJid},
        xml('unsubscribe', {xmlns: MUC_SUB_FEATURE_ID})
    );
}

function makeRetrieveSubscriptionsStanza(conferenceServiceJid: string): Stanza {
    return xml('iq', {type: 'get', to: conferenceServiceJid},
        xml('subscriptions', {xmlns: MUC_SUB_FEATURE_ID})
    );
}

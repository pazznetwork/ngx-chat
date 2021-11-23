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

    /**
     * A room moderator can unsubscribe others providing the their jid as attribute to the information query (iq)
     * see: https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/#unsubscribing-from-a-muc-room
     * @param roomJid for the room to be unsubscribed from
     * @param jid user id to be unsubscribed
     */
    unsubscribeJidFromRoom(roomJid: string, jid: string) {
        this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set', to: roomJid},
                xml('unsubscribe', {xmlns: 'urn:xmpp:mucsub:0', jid}),
            ),
        );
    }

    /**
     * A user can query the MUC service to get their list of subscriptions.
     * see: https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/#g dd ddetting-list-of-subscribed-rooms
     */
    async getSubscribedRooms() {
        const {local, domain} = this.xmppChatAdapter.chatConnectionService.userJid;
        const from = `${local}@${domain}`;
        const subscriptions = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', from, to: 'muc.' + domain},
                xml('subscriptions', {xmlns: 'urn:xmpp:mucsub:0'}),
            ),
        );
        return subscriptions.getChildren('subscription').map(sub => sub.getAttr('jid'));
    }

    /**
     * A subscriber or room moderator can get the list of subscribers by sending <subscriptions/> request directly to the room JID.
     * see: https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/#getting-list-of-subscribers-of-a-room
     * @param roomJid of the room the get a subscriber list from
     */
    getSubscribers(roomJid: string) {
        this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get', to: roomJid},
                xml('subscriptions', {xmlns: 'urn:xmpp:mucsub:0'}),
            ),
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

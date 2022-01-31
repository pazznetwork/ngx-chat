import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IqResponseStanza, Stanza } from '../../../../core/stanza';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppResponseError } from '../xmpp-response.error';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';
import { serializeToSubmitForm } from '../../../../core/form';

export const PUBSUB_EVENT_XMLNS = 'http://jabber.org/protocol/pubsub#event';

interface PublishOptions {
    node?: string;
    id?: any;
    data?: Element;
    persistItems?: boolean;
}

class PublishStanzaBuilder extends AbstractStanzaBuilder {

    private readonly publishOptions: PublishOptions = {
        persistItems: false,
    };

    constructor(options: PublishOptions) {
        super();
        if (options) {
            this.publishOptions = {...this.publishOptions, ...options};
        }
    }

    toStanza() {
        const {node, id, persistItems} = this.publishOptions;

        // necessary as a 'event-only' publish is currently broken in ejabberd, see
        // https://github.com/processone/ejabberd/issues/2799
        const data = this.publishOptions.data || xml('data');

        return xml('iq', {type: 'set'},
            xml('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'},
                xml('publish', {node},
                    xml('item', {id}, data),
                ),
                xml('publish-options', {},
                    serializeToSubmitForm({
                        type: 'submit',
                        instructions: [],
                        fields: [
                            {type: 'hidden', variable: 'FORM_TYPE', value: 'http://jabber.org/protocol/pubsub#publish-options'},
                            {type: 'boolean', variable: 'pubsub#persist_items', value: persistItems === true},
                            {type: 'list-single', variable: 'pubsub#access_model', value: 'whitelist'},
                        ],
                    }),
                ),
            ),
        );
    }

}

class RetrieveDataStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private readonly node: string) {
        super();
    }

    toStanza() {
        return xml('iq', {type: 'get'},
            xml('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'},
                xml('items', {node: this.node}),
            ),
        );
    }

}

/**
 * XEP-0060 Publish Subscribe (https://xmpp.org/extensions/xep-0060.html)
 * XEP-0223 Persistent Storage of Private Data via PubSub (https://xmpp.org/extensions/xep-0223.html)
 */
export class PublishSubscribePlugin extends AbstractXmppPlugin {

    readonly publish$ = new Subject<Stanza>();
    private readonly supportsPrivatePublish = new BehaviorSubject<boolean | 'unknown'>('unknown');

    constructor(
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
    ) {
        super();
    }

    onBeforeOnline() {
        return this.determineSupportForPrivatePublish();
    }

    onOffline() {
        this.supportsPrivatePublish.next('unknown');
    }

    storePrivatePayloadPersistent(node: string, id: string, data: Element): Promise<IqResponseStanza<'result'>> {
        return new Promise((resolve, reject) => {
            this.supportsPrivatePublish
                .pipe(filter(support => support !== 'unknown'))
                .subscribe((support: boolean) => {
                    if (!support) {
                        reject(new Error('does not support private publish subscribe'));
                    } else {
                        resolve(this.xmppChatAdapter.chatConnectionService.sendIq(
                            new PublishStanzaBuilder({node, id, data, persistItems: true}).toStanza(),
                        ));
                    }
                });
        });
    }

    privateNotify(node: string, data?: Element, id?: string): Promise<IqResponseStanza> {
        return new Promise((resolve, reject) => {
            this.supportsPrivatePublish
                .pipe(filter(support => support !== 'unknown'))
                .subscribe((support: boolean) => {
                    if (!support) {
                        reject(new Error('does not support private publish subscribe'));
                    } else {
                        resolve(this.xmppChatAdapter.chatConnectionService.sendIq(
                            new PublishStanzaBuilder({node, id, data, persistItems: false}).toStanza(),
                        ));
                    }
                });
        });
    }

    handleStanza(stanza: Stanza): boolean {
        const eventElement = stanza.getChild('event', PUBSUB_EVENT_XMLNS);
        if (stanza.is('message') && eventElement) {
            this.publish$.next(eventElement);
            return true;
        }
        return false;
    }

    async retrieveNodeItems(node: string): Promise<Element[]> {
        try {
            const iqResponseStanza = await this.xmppChatAdapter.chatConnectionService.sendIq(
                new RetrieveDataStanzaBuilder(node).toStanza(),
            );
            return iqResponseStanza.getChild('pubsub').getChild('items').getChildren('item');
        } catch (e) {
            if (e instanceof XmppResponseError &&
                (e.errorCondition === 'item-not-found' || e.errorCode === 404)) {
                return [];
            }

            throw e;
        }
    }

    private async determineSupportForPrivatePublish() {
        let isSupported: boolean;
        try {
            const service = await this.serviceDiscoveryPlugin.findService('pubsub', 'pep');
            isSupported = service.features.includes('http://jabber.org/protocol/pubsub#publish-options');
        } catch (e) {
            isSupported = false;
        }
        this.supportsPrivatePublish.next(isSupported);
    }

}

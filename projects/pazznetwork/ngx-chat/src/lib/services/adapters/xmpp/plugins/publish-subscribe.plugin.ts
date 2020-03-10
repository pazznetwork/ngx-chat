import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IqResponseStanza, Stanza } from '../../../../core/stanza';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

export const PUBSUB_EVENT_XMLNS = 'http://jabber.org/protocol/pubsub#event';

interface PublishOptions {
    node?: string;
    id?: any;
    data?: Element;
    persistItems?: boolean;
}

class PublishStanzaBuilder extends AbstractStanzaBuilder {

    private publishOptions: PublishOptions = {
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
        const data = this.publishOptions.data || xml('data');

        return xml('iq', {type: 'set'},
            xml('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'},
                xml('publish', {node},
                    xml('item', {id}, data)
                ),
                xml('publish-options', {},
                    xml('x', {xmlns: 'jabber:x:data', type: 'submit'},
                        xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                            xml('value', {}, 'http://jabber.org/protocol/pubsub#publish-options')
                        ),
                        xml('field', {var: 'pubsub#persist_items'},
                            xml('value', {}, persistItems ? 1 : 0)
                        ),
                        xml('field', {var: 'pubsub#access_model'},
                            xml('value', {}, 'whitelist')
                        )
                    )
                )
            )
        );
    }

}

class RetrieveDataStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private node: string) {
        super();
    }

    toStanza() {
        return xml('iq', {type: 'get'},
            xml('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'},
                xml('items', {node: this.node})
            )
        );
    }

}

/**
 * XEP-0060 Publish Subscribe
 * XEP-0223 Persistent Storage of Private Data via PubSub
 */
export class PublishSubscribePlugin extends AbstractXmppPlugin {

    publish$ = new Subject<Stanza>();
    private supportsPrivatePublish = new BehaviorSubject<boolean | 'unknown'>('unknown');

    constructor(private xmppChatAdapter: XmppChatAdapter, private serviceDiscoveryPlugin: ServiceDiscoveryPlugin) {
        super();
    }

    onBeforeOnline() {
        return this.determineSupportForPrivatePublish();
    }

    onOffline() {
        this.supportsPrivatePublish.next('unknown');
    }

    storePrivatePayloadPersistent(node: string, id: string, data: Element): Promise<IqResponseStanza> {
        return new Promise((resolve, reject) => {
            this.supportsPrivatePublish
                .pipe(filter(support => support !== 'unknown'))
                .subscribe((support: boolean) => {
                    if (!support) {
                        reject('does not support private publish subscribe');
                    } else {
                        resolve(this.xmppChatAdapter.chatConnectionService.sendIq(
                            new PublishStanzaBuilder({node, id, data, persistItems: true}).toStanza()
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
                        reject('does not support private publish subscribe');
                    } else {
                        resolve(this.xmppChatAdapter.chatConnectionService.sendIq(
                            new PublishStanzaBuilder({node, id, data, persistItems: false}).toStanza()
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
                new RetrieveDataStanzaBuilder(node).toStanza()
            );
            return iqResponseStanza.getChild('pubsub').getChild('items').getChildren('item');
        } catch (e) {
            return [];
        }
    }

    private async determineSupportForPrivatePublish() {
        let isSupported: boolean;
        try {
            const service = await this.serviceDiscoveryPlugin.findService('pubsub', 'pep');
            isSupported = service.features.indexOf('http://jabber.org/protocol/pubsub#publish-options') > -1;
        } catch (e) {
            isSupported = false;
        }
        this.supportsPrivatePublish.next(isSupported);
    }

}

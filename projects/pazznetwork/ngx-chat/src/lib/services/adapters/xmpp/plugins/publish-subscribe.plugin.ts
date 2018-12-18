import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IqResponseStanza } from '../../../../core';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

class PublishPrivateDataStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private node: string, private id: string, private data: Element) {
        super();
    }

    toStanza() {
        return xml('iq', {type: 'set'},
            xml('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'},
                xml('publish', {node: this.node},
                    xml('item', {id: this.id},
                        this.data
                    )
                ),
                xml('publish-options', {},
                    xml('x', {xmlns: 'jabber:x:data', type: 'submit'},
                        xml('field', {var: 'FORM_TYPE', type: 'hidden'},
                            xml('value', {}, 'http://jabber.org/protocol/pubsub#publish-options')
                        ),
                        xml('field', {var: 'pubsub#persist_items'},
                            xml('value', {}, 'true')
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

    private supportsPrivatePublish = new BehaviorSubject<boolean | 'unknown'>('unknown');

    constructor(private xmppChatAdapter: XmppChatAdapter) {
        super();
    }

    onBeforeOnline() {
        return this.determineSupportForPrivatePublish();
    }

    onOffline() {
        this.supportsPrivatePublish.next('unknown');
    }

    publishPrivate(node: string, id: string, data: Element): Promise<IqResponseStanza> {
        return new Promise((resolve, reject) => {
            this.supportsPrivatePublish
                .pipe(filter(support => support !== 'unknown'))
                .subscribe((support: boolean) => {
                    if (!support) {
                        reject('does not support private publish subscribe');
                    } else {
                        resolve(this.xmppChatAdapter.chatConnectionService.sendIq(
                            new PublishPrivateDataStanzaBuilder(node, id, data).toStanza()
                        ));
                    }
                });
        });
    }

    async retrieveNodeItems(node: string) {
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
            const service = await this.xmppChatAdapter.getPlugin(ServiceDiscoveryPlugin).findService('pubsub', 'pep');
            isSupported = service.features.indexOf('http://jabber.org/protocol/pubsub#publish-options') > -1;
        } catch (e) {
            isSupported = false;
        }
        this.supportsPrivatePublish.next(isSupported);
    }

}

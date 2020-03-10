import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

class QueryStanzaBuilder extends AbstractStanzaBuilder {

    constructor(private xmlns: string, private to?: string) {
        super();
    }

    toStanza() {
        const attrs: { [key: string]: string } = {type: 'get'};
        if (this.to) {
            attrs.to = this.to;
        }
        return xml('iq', attrs,
            xml('query', {xmlns: this.xmlns})
        );
    }

}

export interface Identity {
    category: string;
    type: string;
    name?: string;
}

export interface Service {
    jid: string;
    identities: Identity[];
    features: string[];
}

/**
 * see XEP-0030 Service Discovery
 */
export class ServiceDiscoveryPlugin extends AbstractXmppPlugin {

    public static readonly DISCO_INFO = 'http://jabber.org/protocol/disco#info';
    public static readonly DISCO_ITEMS = 'http://jabber.org/protocol/disco#items';

    private servicesInitialized$ = new BehaviorSubject(false);
    private services: Service[] = [];

    constructor(private chatAdapter: XmppChatAdapter) {
        super();
    }

    onBeforeOnline() {
        return Promise.all([this.discoverServerFeatures(), this.discoverServices()])
            .then(() => this.servicesInitialized$.next(true));
    }

    onOffline() {
        this.servicesInitialized$.next(false);
        this.services = [];
    }

    findService(category: string, type: string): Promise<Service> {

        return new Promise((resolve, reject) => {

            this.servicesInitialized$.pipe(first(value => !!value)).subscribe(() => {
                const results = this.services.filter(service =>
                    service.identities.filter(identity => identity.category === category && identity.type === type).length > 0
                );

                if (results.length === 0) {
                    reject(`no service matching category ${category} and type ${type} found!`);
                } else if (results.length > 1) {
                    reject(`multiple services matching category ${category} and type ${type} found! ${JSON.stringify(results)}`);
                } else {
                    return resolve(results[0]);
                }
            });

        });

    }

    private async discoverServerFeatures() {
        this.services.push(await this.discoverServiceInformation(this.chatAdapter.chatConnectionService.userJid.domain));
    }

    private async discoverServices() {
        const serviceListResponsePromise = await this.chatAdapter.chatConnectionService.sendIq(
            new QueryStanzaBuilder(
                ServiceDiscoveryPlugin.DISCO_ITEMS, this.chatAdapter.chatConnectionService.userJid.domain).toStanza()
        );

        const serviceDomains = serviceListResponsePromise
            .getChild('query')
            .getChildren('item').map((itemNode: Element) => itemNode.attrs.jid);

        const discoveredServices: Service[] = await Promise.all(
            serviceDomains.map((serviceDomain: string) => this.discoverServiceInformation(serviceDomain)));
        this.services.push(...discoveredServices);
    }

    private async discoverServiceInformation(serviceDomain: string): Promise<Service> {
        const serviceInformationResponse = await this.chatAdapter.chatConnectionService.sendIq(
            new QueryStanzaBuilder(ServiceDiscoveryPlugin.DISCO_INFO, serviceDomain).toStanza()
        );

        const queryNode = serviceInformationResponse.getChild('query');
        const features = queryNode.getChildren('feature').map((featureNode: Element) => featureNode.attrs.var);
        return {
            identities: queryNode.getChildren('identity').map((identityNode: Element) => identityNode.attrs),
            features,
            jid: serviceInformationResponse.attrs.from
        };
    }

}

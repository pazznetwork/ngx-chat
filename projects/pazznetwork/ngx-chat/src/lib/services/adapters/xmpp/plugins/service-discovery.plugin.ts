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
    private hostedServices: Service[] = [];
    private resourceCache: {[jid: string]: Service} = {};

    constructor(private chatAdapter: XmppChatAdapter) {
        super();
    }

    async onBeforeOnline() {
        const services = await this.discoverServices(this.chatAdapter.chatConnectionService.userJid.domain);
        this.servicesInitialized$.next(true);
        return services;
    }

    onOffline() {
        this.servicesInitialized$.next(false);
        this.hostedServices = [];
        this.resourceCache = {};
    }

    supportsFeature(jid: string, feature: string): Promise<boolean> {

        return new Promise((resolve, reject) => {

            this.servicesInitialized$.pipe(first(value => !!value)).subscribe(async () => {
                try {
                    const service = this.resourceCache[jid] || await this.discoverServiceInformation(jid);
                    if (!service) {
                        reject(new Error('no service found for jid ' + jid));
                    }
                    const results = this.resourceCache[jid].features.filter(resource => resource.indexOf(feature) >= 0);
                    resolve(results.length > 0);
                } catch (e) {
                    reject(e);
                }
            });

        });

    }

    findService(category: string, type: string): Promise<Service> {

        return new Promise((resolve, reject) => {

            this.servicesInitialized$.pipe(first(value => !!value)).subscribe(() => {
                const results = this.hostedServices.filter(service =>
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

    private async discoverServices(mainDomain: string) {
        const serviceListResponse = await this.chatAdapter.chatConnectionService.sendIq(
            new QueryStanzaBuilder(
                ServiceDiscoveryPlugin.DISCO_ITEMS, this.chatAdapter.chatConnectionService.userJid.domain).toStanza()
        );

        const serviceDomains = serviceListResponse
            .getChild('query')
            .getChildren('item')
            .map((itemNode: Element) => itemNode.attrs.jid);
        serviceDomains.push(mainDomain);

        const distinctServiceDomains = Object.keys(
            serviceDomains.reduce((previousValue, currentValue) => {
                previousValue[currentValue] = true;
                return previousValue;
            }, {})
        );

        const discoveredServices: Service[] = await Promise.all(
            distinctServiceDomains.map((serviceDomain: string) => this.discoverServiceInformation(serviceDomain)));
        this.hostedServices.push(...discoveredServices);
    }

    private async discoverServiceInformation(serviceDomain: string): Promise<Service> {
        const serviceInformationResponse = await this.chatAdapter.chatConnectionService.sendIq(
            new QueryStanzaBuilder(ServiceDiscoveryPlugin.DISCO_INFO, serviceDomain).toStanza()
        );

        const queryNode = serviceInformationResponse.getChild('query');
        const features = queryNode.getChildren('feature').map((featureNode: Element) => featureNode.attrs.var);
        const serviceInformation = {
            identities: queryNode.getChildren('identity').map((identityNode: Element) => identityNode.attrs),
            features,
            jid: serviceInformationResponse.attrs.from
        };
        this.resourceCache[serviceInformationResponse.attrs.from] = serviceInformation;
        return serviceInformation;
    }

}

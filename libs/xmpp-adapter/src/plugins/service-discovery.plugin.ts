// SPDX-License-Identifier: MIT
import { firstValueFrom, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import type { XmppService } from '../xmpp.service';
import type { ChatPlugin } from '../core';

export interface Service {
  jid: string;
  // string in format category.type
  identities: string[];
  features: string[];
}

export const nsDisco = 'http://jabber.org/protocol/disco';
export const nsDiscoInfo = `${nsDisco}#info`;
export const nsDiscoItems = `${nsDisco}#items`;

/**
 * see XEP-0030 Service Discovery
 * https://xmpp.org/extensions/xep-0030.html
 */
export class ServiceDiscoveryPlugin implements ChatPlugin {
  readonly nameSpace = nsDisco;
  private readonly servicesInitializedSubject = new Subject<void>();
  readonly servicesInitialized$ = this.servicesInitializedSubject.pipe(
    shareReplay({ bufferSize: 1, refCount: false })
  );
  private readonly identityToService = new Map<string, Service>();
  private readonly jidToService = new Map<string, Service>();

  constructor(private readonly chatAdapter: XmppService) {}

  async ensureServicesAreDiscovered(domain: string): Promise<void> {
    await this.discoverServiceItems(domain);
    await this.discoverServiceInformation(domain);
    this.servicesInitializedSubject.next();
  }

  clearDiscovered(): void {
    this.identityToService.clear();
    this.jidToService.clear();
  }

  async supportsFeature(jid: string, searchedFeature: string): Promise<boolean> {
    await firstValueFrom(this.servicesInitialized$);

    const service = this.jidToService.get(jid) || (await this.discoverServiceInformation(jid));
    return service.features.includes(searchedFeature);
  }

  // TODO: into key collection(Enum) of used and tested keys
  async findService(
    category: 'conference' | 'pubsub' | 'store',
    type: 'text' | 'pep' | 'file' | 'push'
  ): Promise<Service> {
    await firstValueFrom(this.servicesInitialized$);
    const key = category + '.' + type;

    if (!this.identityToService.has(key)) {
      throw new Error(
        `no service matching category ${category} and type ${type} found! Know service: ${Array.from(
          this.identityToService.values()
        ).join(', ')}`
      );
    }

    return this.identityToService.get(key) as Service;
  }

  private async discoverServiceItems(domain: string): Promise<void> {
    const serviceListResponse = await this.chatAdapter.chatConnectionService
      .$iq({ type: 'get', to: domain })
      .c('query', { xmlns: nsDiscoItems })
      .send();

    const items = serviceListResponse.querySelector('query')?.querySelectorAll('item');

    if (!items) {
      throw new Error(`Did not find any items`);
    }

    const serviceDomains = new Set(
      Array.from(items).map((itemNode: Element) => itemNode.getAttribute('jid'))
    );

    await Promise.all(
      [...serviceDomains.keys()].map((serviceDomain) =>
        this.discoverServiceInformation(serviceDomain as string)
      )
    );
  }

  private async discoverServiceInformation(serviceDomain: string): Promise<Service> {
    const serviceInformationResponse = await this.chatAdapter.chatConnectionService
      .$iq({ type: 'get', to: serviceDomain })
      .c('query', { xmlns: nsDiscoInfo })
      .send();

    const queryNode = serviceInformationResponse.querySelector('query');
    if (!queryNode) {
      throw Error('No query in serviceInformationResponse');
    }
    const features = Array.from(queryNode.querySelectorAll('feature')).map(
      (featureNode: Element) => featureNode.getAttribute('var') as string
    );
    const identities = Array.from(queryNode.querySelectorAll('identity'));

    const from = serviceInformationResponse.getAttribute('from');
    const serviceInformation: Service = {
      identities: identities.map(
        (identity) =>
          `${identity.getAttribute('category') ?? ''}.${identity.getAttribute('type') ?? ''}`
      ),
      features,
      jid: from as string,
    };
    this.jidToService.set(from as string, serviceInformation);
    for (const identity of serviceInformation.identities) {
      this.identityToService.set(identity, serviceInformation);
    }
    return serviceInformation;
  }
}

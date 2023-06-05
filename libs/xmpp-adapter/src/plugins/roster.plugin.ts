// SPDX-License-Identifier: MIT
import {
  Contact,
  ContactSubscription,
  JID,
  parseJid,
  Presence,
} from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin, PresenceStanza, Stanza } from '../core';
import { Finder } from '../core';
import type { XmppService } from '../xmpp.service';
import { nsMuc } from './multi-user-chat';
import {
  combineLatest,
  firstValueFrom,
  map,
  merge,
  mergeMap,
  Observable,
  OperatorFunction,
  pairwise,
  scan,
  startWith,
  Subject,
} from 'rxjs';
import { filter, shareReplay, switchMap } from 'rxjs/operators';
import { NS } from '@pazznetwork/strophets';

/**
 * Current @TODOS:
 * 2. move contacts observable to roster plugin as source of truth, inner Behaviour Subject outer Observable
 * 3. actions on contact as private subjects to avoid async
 */

// https://xmpp.org/extensions/xep-0144.html
export const nsRosterX = 'jabber:x:roster';

// https://xmpp.org/rfcs/rfc3921.html#stanzas-presence-children-show
const presenceMapping = {
  chat: Presence.present,
  null: Presence.present,
  away: Presence.away,
  dnd: Presence.away,
  xa: Presence.away,
} as const;

/**
 * https://xmpp.org/rfcs/rfc6121.html#roster-add-success
 */
export class RosterPlugin implements ChatPlugin {
  readonly nameSpace = NS.ROSTER;

  private readonly getContactRequestSubject = new Subject<Contact>();
  private readonly removeContactByJIDSubject = new Subject<JID>();

  readonly contacts$: Observable<Contact[]>;
  readonly contactsSubscribed$: Observable<Contact[]>;
  readonly contactRequestsReceived$: Observable<Contact[]>;
  readonly contactRequestsSent$: Observable<Contact[]>;
  readonly contactsUnaffiliated$: Observable<Contact[]>;

  constructor(private readonly chatService: XmppService) {
    this.contacts$ = merge(
      this.getContactRequestSubject.pipe(
        map((contact) => (state: Map<string, Contact>) => {
          console.log('newContactSubject contact', contact);
          const key = contact.jid.toString();
          if (state.has(key)) {
            return state;
          }
          state.set(key, contact);
          return state;
        })
      ),
      this.removeContactByJIDSubject.pipe(
        map((jid) => (state: Map<string, Contact>) => {
          state.delete(jid.toString());
          return state;
        })
      ),
      this.chatService.onOffline$.pipe(
        map(() => (state: Map<string, Contact>) => {
          state.clear();
          return state;
        })
      ),
      this.chatService.onOnline$.pipe(
        mergeMap(() => this.getRosterContacts()),
        map((contacts) => () => {
          const state = new Map<string, Contact>();
          contacts.forEach((c) => state.set(c.jid.toString(), c));
          return state;
        })
      )
    ).pipe(
      scan((state, innerFun) => innerFun(state), new Map<string, Contact>()),
      map((contactMap) => Array.from(contactMap.values())),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    chatService.onOnline$.pipe(switchMap(() => this.initializeHandler())).subscribe();

    const statedContacts$ = this.contacts$.pipe(
      mergeMap((contacts) =>
        combineLatest(
          contacts.map((contact) => contact.subscription$.pipe(map((sub) => ({ contact, sub }))))
        )
      ),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    const mapToContactByFilter = (
      predicate: (sub: ContactSubscription) => boolean
    ): OperatorFunction<{ contact: Contact; sub: ContactSubscription }[], Contact[]> =>
      map((statedContacts) =>
        statedContacts.filter(({ sub }) => predicate(sub)).map(({ contact }) => contact)
      );

    this.contactsSubscribed$ = statedContacts$.pipe(
      mapToContactByFilter(
        (sub) => sub === ContactSubscription.both || sub === ContactSubscription.to
      )
    );

    this.contactRequestsReceived$ = statedContacts$.pipe(
      mapToContactByFilter((sub) => sub === ContactSubscription.from)
    );
    this.contactRequestsSent$ = statedContacts$.pipe(
      mapToContactByFilter((sub) => sub === ContactSubscription.to)
    );
    this.contactsUnaffiliated$ = statedContacts$.pipe(
      mapToContactByFilter((sub) => sub === ContactSubscription.none)
    );
  }

  private async handleRosterPushStanza(stanza: Stanza): Promise<boolean> {
    const currentUser = await firstValueFrom(this.chatService.userJid$);
    if (
      Finder.create(stanza).searchByTag('block').result ||
      Finder.create(stanza).searchByTag('unblock').result
    ) {
      return true;
    }

    const fromAttr = stanza.getAttribute('from');
    if (!fromAttr) {
      throw new Error(`from is undefined`);
    }
    const currentUserJid = parseJid(currentUser).bare();
    const fromJid = parseJid(fromAttr).bare();

    if (!fromJid.equals(currentUserJid)) {
      // Security Warning: Traditionally, a roster push included no 'from' address, with the result that all roster pushes were sent
      // implicitly from the bare JID of the account itself. However, this specification allows entities other than the user's server
      // to maintain roster information, which means that a roster push might include a 'from' address other than the bare JID of the
      // user's account. Therefore, the client MUST check the 'from' address to verify that the sender of the roster push is authorized
      // to update the roster. If the client receives a roster push from an unauthorized entity, it MUST NOT process the pushed data; in
      // addition, the client can either return a stanza error of <service-unavailable/> error or refuse to return a stanza error at all
      // (the latter behavior overrides a MUST-level requirement from [XMPP‑CORE] for the purpose of preventing a presence leak).
      return true;
    }

    const rosterItem = Finder.create(stanza).searchByTag('query').searchByTag('item').result;
    const id = stanza.getAttribute('id') ?? 'invalidId';

    if (!rosterItem) {
      throw new Error(
        'No valid rosterItem to acknowledge as roosterItem was undefined ' + stanza.outerHTML
      );
    }

    // acknowledge the reception of the pushed roster stanza
    await this.chatService.chatConnectionService
      .$iq({ from: fromAttr, id, type: 'result' })
      .sendResponseLess();

    const contacts = this.rosterQueryResultToContacts(stanza);
    for (const contact of contacts) {
      // We need to check if the contact is already in the roster
      await this.getOrCreateContactById(
        contact.jid.toString(),
        contact.name,
        await firstValueFrom(contact.subscription$),
        contact.avatar
      );
    }
    return true;
  }

  /**
   * XML Schemas:
   *  https://xmpp.org/extensions/xep-0093.html#sect-idm45824493790976
   * core https://datatracker.ietf.org/doc/html/rfc6121#appendix-D
   * Attributes:
   *  Subscription values:
   *      subscription='none': you aren't interested in the item's presence, and neither is the item interested in yours.
   *      subscription='from': the item is interested in your presence information, but you don't care about the contact.
   *      subscription='to': You are interested in the item's presence information, but the contact is not interested in yours.
   *      subscription='both': You and the contact are interested in each other's presence information.
   *  Ask value:
   *      subscribed: indicates the server is still processing the subscription end-state
   *  name is optional.
   *  can have child item group, used as tags for grouping contacts
   *
   * Notes:
   *   Edge case: only as ask attribute no subscription field, user made a subscription request in the past but now no longer exits on the server
   *
   * @param rosterIQResult XMl Object from jabber:iq:roster namespace
   */
  private rosterQueryResultToContacts(rosterIQResult: Stanza): Contact[] {
    return Finder.create(rosterIQResult)
      .searchByTag('query')
      .searchByTag('item')
      .results.map((rosterItem) => {
        const to = rosterItem.getAttribute('jid') as string;
        const attrName = rosterItem.getAttribute('name') ?? to;
        const name = attrName.includes('@') ? (attrName?.split('@')?.[0] as string) : attrName;

        // The default is to because there is no subscription attribute on roster items,
        // we assume that the user has subscribed to the contact
        // when adding him to the roster as does our code
        // The ask attribute in the roster item element is an optional attribute used to indicate an outstanding subscription request.
        // I can have only the value 'subscribe'.
        // This value indicates that a subscription request is pending and has been sent to the contact specified by the 'jid' attribute.
        const subscription = ContactSubscription.to;

        return new Contact(to, name, undefined, subscription);
      });
  }

  async initializeHandler(): Promise<void> {
    await this.chatService.chatConnectionService.addHandler(
      (stanza) => this.handleRosterPushStanza(stanza),
      {
        ns: NS.CLIENT,
        name: 'iq',
        type: 'set',
      }
    );

    await this.chatService.chatConnectionService.addHandler(
      (stanza) => this.handlePresenceStanza(stanza),
      {
        name: 'presence',
      }
    );

    await this.chatService.chatConnectionService.addHandler(
      (stanza) => this.handleRosterXPush(stanza),
      {
        ns: nsRosterX,
        name: 'message',
      }
    );
  }

  private async handlePresenceStanza(stanza: PresenceStanza): Promise<boolean> {
    const userJid = await firstValueFrom(this.chatService.userJid$);
    const type = stanza.getAttribute('type');

    if (type === 'error') {
      return true;
    }

    const fromJid = stanza.getAttribute('from');

    if (fromJid == null) {
      throw new Error(
        'Can not handle presence stanza without a from attribute, stanza=' + stanza.outerHTML
      );
    }

    if (userJid.split('/')[0] === fromJid?.split('/')[0]) {
      return true;
    }

    if (Finder.create(stanza).searchByTag('query').searchByNamespace(nsMuc).result) {
      return false;
    }

    if (Finder.create(stanza).searchByTag('x').searchByNamespaceStartsWith(nsMuc).result) {
      return false;
    }

    const fromContact = await this.getOrCreateContactById(
      fromJid,
      fromJid,
      ContactSubscription.from
    );

    const show = Finder.create(stanza).searchByTag('show')?.result?.textContent;
    const handleShowAsDefault = show == null || !Object.keys(presenceMapping).includes(show);

    if (!type && handleShowAsDefault) {
      fromContact.updateResourcePresence(fromJid, presenceMapping.null);
      return true;
    }

    if (!type && !handleShowAsDefault) {
      fromContact.updateResourcePresence(fromJid, presenceMapping[show] as Presence);
      return true;
    }

    if (type === 'unavailable') {
      fromContact.updateResourcePresence(fromJid, Presence.unavailable);
      return true;
    }

    if (type === 'subscribe') {
      if (await firstValueFrom(fromContact.isSubscribed())) {
        // subscriber is already a contact of us, approve subscription
        await this.sendApprovalSubscription(fromJid);
        await fromContact.updateSubscriptionOnReceived();
        return true;
      } else if (fromContact) {
        // subscriber is known but not subscribed or pending
        return true;
      }
    }

    if (type === 'subscribed') {
      await fromContact.updateSubscriptionOnRequestSent();
      await this.sendAcknowledgeSubscribe(fromJid);
      return true;
    }

    if (type === 'unsubscribed') {
      await this.sendAcknowledgeUnsubscribe(fromJid);
      return true;
    }
    // do nothing on true and for false we didn't handle the stanza properly
    return type === 'unsubscribe';
  }

  /**
   * https://www.rfc-editor.org/rfc/rfc6121#section-3.4.1
   *
   * @param jid
   * @private
   */
  private async sendApprovalSubscription(jid: string): Promise<void> {
    await this.chatService.chatConnectionService
      .$pres({ to: jid, type: 'subscribed' })
      .sendResponseLess();
  }

  async getRosterContacts(): Promise<Contact[]> {
    const responseStanza = await this.chatService.chatConnectionService
      .$iq({ type: 'get' })
      .c('query', { xmlns: this.nameSpace })
      .send();

    return this.rosterQueryResultToContacts(responseStanza);
  }

  async getContactById(jidPlain: string): Promise<Contact | undefined> {
    const contacts = await firstValueFrom(this.contacts$);
    return contacts.find((contact) => contact?.jid.bare()?.equals(parseJid(jidPlain).bare()));
  }

  async getOrCreateContactById(
    jid: string,
    name = jid,
    subscription?: ContactSubscription,
    avatar?: string
  ): Promise<Contact> {
    const definedName = name?.includes('@') ? (name?.split('@')?.[0] as string) : name;
    const newContact = new Contact(jid, definedName, avatar, subscription);
    this.getContactRequestSubject.next(newContact);
    return (await this.getContactById(jid)) as Contact;
  }

  async addContact(jid: string): Promise<void> {
    const existingContact = await this.getContactById(jid);
    if (existingContact && (await firstValueFrom(existingContact.isSubscribed()))) {
      return;
    }

    // new contact should come from the server push
    const moreContactsPromise = firstValueFrom(
      this.contacts$.pipe(
        startWith([]),
        pairwise(),
        filter(([a, b]) => a.length < b.length)
      )
    );

    await this.sendAddToRoster(jid);
    // subscribe is necessary because a subscribed won't be resent to user after getting online
    await this.sendSubscribe(jid);
    await moreContactsPromise;
  }

  private async sendAddToRoster(jid: string): Promise<Element> {
    return this.chatService.chatConnectionService
      .$iq({ type: 'set' })
      .c('query', { xmlns: this.nameSpace })
      .c('item', { jid })
      .send();
  }

  async removeRosterContact(jid: string): Promise<void> {
    await this.sendRemoveFromRoster(jid);
    await this.unauthorizePresenceSubscription(jid);
    this.removeContactByJIDSubject.next(parseJid(jid));
  }

  private async sendRemoveFromRoster(jid: string): Promise<void> {
    await this.chatService.chatConnectionService
      .$iq({ type: 'set' })
      .c('query', { xmlns: this.nameSpace })
      .c('item', { jid, subscription: 'remove' })
      .send();
  }

  private async unauthorizePresenceSubscription(jid: string): Promise<void> {
    await this.chatService.chatConnectionService
      .$pres({ to: jid, type: 'unsubscribed' })
      .sendResponseLess();
  }

  /**
   * Upon receiving the presence stanza of type "subscribed",
   * the user SHOULD acknowledge receipt of that subscription
   * state notification by sending a presence stanza of type
   * "subscribe" to the contact
   *
   * @param jid - The Jabber ID of the user to whom one is subscribing
   */
  private async sendAcknowledgeSubscribe(jid: string): Promise<void> {
    await this.chatService.chatConnectionService.$pres({ to: jid, type: 'subscribe' }).send();
  }

  /**
   * Upon receiving the presence stanza of type "unsubscribed",
   * the user SHOULD acknowledge receipt of that subscription state
   * notification by sending a presence stanza of type "unsubscribe"
   * this step lets the user's server know that it MUST no longer
   * send notification of the subscription state change to the user.
   *
   * @param jid - The Jabber ID of the user who is unsubscribing
   */
  private async sendAcknowledgeUnsubscribe(jid: string): Promise<void> {
    await this.chatService.chatConnectionService.$pres({ to: jid, type: 'unsubscribe' }).send();
  }

  private async handleRosterXPush(elem: Element): Promise<boolean> {
    const items = Array.from(elem.querySelectorAll('item')).filter(
      (item) => item.getAttribute('action') === 'add'
    );
    for (const item of items) {
      await this.addContact(item.getAttribute('jid') as string);
    }
    return true;
  }

  private async sendSubscribe(jid: string): Promise<void> {
    await this.chatService.chatConnectionService
      .$pres({ to: jid, type: 'subscribe' })
      .sendResponseLess();
  }
}

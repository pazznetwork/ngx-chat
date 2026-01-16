// SPDX-License-Identifier: MIT
import type {
  Contact,
  ContactListService,
  ContactSubscription,
} from '@pazznetwork/ngx-chat-shared';
import { runInZone } from '@pazznetwork/ngx-chat-shared';
import { combineLatest, map, Observable, startWith } from 'rxjs';
import type { BlockPlugin, RosterPlugin } from '@pazznetwork/xmpp-adapter';
import { NgZone } from '@angular/core';

export class XmppContactListService implements ContactListService {
  readonly blockedContactJIDs$: Observable<Set<string>>;
  readonly contactRequestsReceived$: Observable<Contact[]>;
  readonly contactRequestsSent$: Observable<Contact[]>;
  readonly contacts$: Observable<Contact[]>;
  readonly contactsSubscribed$: Observable<Contact[]>;
  readonly contactsUnaffiliated$: Observable<Contact[]>;
  readonly contactsBlocked$: Observable<Contact[]>;

  constructor(
    private readonly rosterPlugin: RosterPlugin,
    private readonly blockPlugin: BlockPlugin,
    zone: NgZone
  ) {
    this.contacts$ = rosterPlugin.contacts$.pipe(
      map((contactMap) => Array.from(contactMap.values())),
      runInZone(zone)
    );
    this.contactsSubscribed$ = rosterPlugin.contactsSubscribed$.pipe(runInZone(zone));
    this.contactRequestsReceived$ = rosterPlugin.contactRequestsReceived$.pipe(runInZone(zone));
    this.contactRequestsSent$ = rosterPlugin.contactRequestsSent$.pipe(runInZone(zone));
    this.contactsUnaffiliated$ = combineLatest([
      rosterPlugin.contactsUnaffiliated$,
      this.blockPlugin.blockedContactJIDs$,
    ]).pipe(
      map(([contacts, blockedJIDs]) => {
        const filtered = contacts.filter((c) => !blockedJIDs.has(c.jid.bare().toString()));
        return filtered;
      }),
      runInZone(zone)
    );
    this.blockedContactJIDs$ = blockPlugin.blockedContactJIDs$.pipe(runInZone(zone));

    this.contactsBlocked$ = combineLatest([
      this.contacts$,
      rosterPlugin.contactsUnaffiliated$,
      this.blockPlugin.blockedContactJIDs$,
    ]).pipe(
      map(([contacts, unaffiliated, blockedJIDs]) => {
        // Merge and dedup by JID
        const allContacts = new Map<string, Contact>();
        contacts.forEach(c => allContacts.set(c.jid.bare().toString(), c));
        unaffiliated.forEach(c => allContacts.set(c.jid.bare().toString(), c));

        return Array.from(allContacts.values()).filter((c) => blockedJIDs.has(c.jid.bare().toString()));
      }),
      runInZone(zone),
      startWith([])
    );
  }

  async blockJid(bareJid: string): Promise<void> {
    await this.blockPlugin.blockJid(bareJid);
  }

  async unblockJid(bareJid: string): Promise<void> {
    await this.blockPlugin.unblockJid(bareJid);
  }

  getContactById(jidPlain: string): Promise<Contact | undefined> {
    return this.rosterPlugin.getContactById(jidPlain);
  }

  getOrCreateContactById(
    jid: string,
    name?: string,
    subscription?: ContactSubscription,
    avatar?: string
  ): Promise<Contact> {
    return this.rosterPlugin.getOrCreateContactById(jid, name, subscription, avatar);
  }

  async addContact(jid: string): Promise<void> {
    await this.rosterPlugin.addContact(jid);
  }

  async removeContact(jid: string): Promise<void> {
    await this.rosterPlugin.removeRosterContact(jid);
  }
}

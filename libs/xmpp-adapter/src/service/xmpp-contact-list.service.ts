// SPDX-License-Identifier: MIT
import type {
  Contact,
  ContactListService,
  ContactSubscription,
} from '@pazznetwork/ngx-chat-shared';
import { combineLatest, map, Observable, startWith } from 'rxjs';
import type { BlockPlugin, RosterPlugin } from '@pazznetwork/xmpp-adapter';

export class XmppContactListService implements ContactListService {
  readonly blockedContactJIDs$: Observable<Set<string>>;
  readonly blockedContacts$: Observable<Contact[]>;
  readonly contactRequestsReceived$: Observable<Contact[]>;
  readonly contactRequestsSent$: Observable<Contact[]>;
  readonly contacts$: Observable<Contact[]>;
  readonly contactsSubscribed$: Observable<Contact[]>;
  readonly contactsUnaffiliated$: Observable<Contact[]>;
  readonly notBlockedContacts$: Observable<Contact[]>;

  constructor(
    private readonly rosterPlugin: RosterPlugin,
    private readonly blockPlugin: BlockPlugin
  ) {
    this.contacts$ = rosterPlugin.contacts$;
    this.contactsSubscribed$ = rosterPlugin.contactsSubscribed$;
    this.contactRequestsReceived$ = rosterPlugin.contactRequestsReceived$;
    this.contactRequestsSent$ = rosterPlugin.contactRequestsSent$;
    this.contactsUnaffiliated$ = rosterPlugin.contactsUnaffiliated$;
    this.blockedContactJIDs$ = blockPlugin.blockedContactJIDs$;

    const contactsWithBlockedPair$ = combineLatest([
      this.contacts$,
      this.blockPlugin.blockedContactJIDs$,
    ]).pipe(
      map(([contacts, blockedJIDs]) => {
        console.log('Contacts in create blockedContacts', contacts);
        console.log('blockedJIDs in create blockedContacts', contacts);
        const blocked: Contact[] = [];
        const notBlocked: Contact[] = [];
        for (const contact of contacts) {
          console.log('BlockedJids', blockedJIDs);
          console.log('Checked contact', contact.jid.bare().toString());
          if (blockedJIDs.has(contact.jid.bare().toString())) {
            blocked.push(contact);
          } else {
            notBlocked.push(contact);
          }
        }
        return { blocked, notBlocked };
      })
    );

    this.blockedContacts$ = contactsWithBlockedPair$.pipe(
      map(({ blocked }) => blocked),
      startWith([])
    );
    this.notBlockedContacts$ = contactsWithBlockedPair$.pipe(
      map(({ notBlocked }) => notBlocked),
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

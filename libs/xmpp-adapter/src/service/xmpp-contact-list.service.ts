// SPDX-License-Identifier: MIT
import type {
  Contact,
  ContactListService,
  ContactSubscription,
} from '@pazznetwork/ngx-chat-shared';
import { combineLatest, map, Observable } from 'rxjs';
import type { BlockPlugin, RosterPlugin } from '@pazznetwork/xmpp-adapter';

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
    private readonly blockPlugin: BlockPlugin
  ) {
    this.contacts$ = rosterPlugin.contacts$;
    this.contactsSubscribed$ = rosterPlugin.contactsSubscribed$;
    this.contactRequestsReceived$ = rosterPlugin.contactRequestsReceived$;
    this.contactRequestsSent$ = rosterPlugin.contactRequestsSent$;
    this.contactsUnaffiliated$ = combineLatest([
      rosterPlugin.contactsUnaffiliated$,
      this.blockPlugin.blockedContactJIDs$,
    ]).pipe(
      map(([contacts, blockedJIDs]) =>
        contacts.filter((c) => !blockedJIDs.has(c.jid.bare().toString()))
      )
    );
    this.blockedContactJIDs$ = blockPlugin.blockedContactJIDs$;

    this.contactsBlocked$ = combineLatest([
      this.contacts$,
      this.blockPlugin.blockedContactJIDs$,
    ]).pipe(
      map(([contacts, blockedJIDs]) =>
        contacts.filter((c) => blockedJIDs.has(c.jid.bare().toString()))
      )
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

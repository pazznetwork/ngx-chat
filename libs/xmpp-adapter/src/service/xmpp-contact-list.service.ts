// SPDX-License-Identifier: MIT
import type {
  Contact,
  ContactListService,
  ContactSubscription,
} from '@pazznetwork/ngx-chat-shared';
import type { Observable } from 'rxjs';
import { combineLatest, partition, scan } from 'rxjs';
import type { BlockPlugin, RosterPlugin } from '@pazznetwork/xmpp-adapter';
import { switchMap } from 'rxjs/operators';

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

    const [blocked$, notBlocked$] = partition(
      combineLatest([
        this.contacts$.pipe(switchMap((contacts) => contacts)),
        this.blockedContactJIDs$,
      ]),
      ([contact, blockedJIDs]) => blockedJIDs.has(contact.jid.toString())
    );

    this.blockedContacts$ = blocked$.pipe(
      scan((acc, [contact]): Contact[] => [contact, ...acc], [] as Contact[])
    );
    this.notBlockedContacts$ = notBlocked$.pipe(
      scan((acc, [contact]): Contact[] => [contact, ...acc], [] as Contact[])
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

  createContactById(
    jid: string,
    name?: string,
    subscription?: ContactSubscription,
    avatar?: string
  ): Contact {
    return this.rosterPlugin.createContactById(jid, name, subscription, avatar);
  }

  async addContact(jid: string): Promise<void> {
    await this.rosterPlugin.addContact(jid);
  }

  async removeContact(jid: string): Promise<void> {
    await this.rosterPlugin.removeRosterContact(jid);
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Observable } from 'rxjs';
import type { Contact } from './contact';

export interface ContactListService {
  readonly blockedContactJIDs$: Observable<Set<string>>;

  /**
   * A list of contacts which the current user has blocked.
   */
  blockedContacts$: Observable<Contact[]>;

  /**
   * contacts$ without the blockedContacts$.
   */
  notBlockedContacts$: Observable<Contact[]>;

  /**
   * A list of contacts to which the current user has accepted subscriptions to.
   */
  contactsSubscribed$: Observable<Contact[]>;

  /**
   * A list of contacts to which a subscription from the user is outstanding.
   */
  contactRequestsSent$: Observable<Contact[]>;

  /**
   * A list of contacts which have sent the user a subscription request.
   */
  contactRequestsReceived$: Observable<Contact[]>;

  /**
   * A list of contacts where the user is not subscribed to and neither a pending request is incoming nor outgoing.
   */
  contactsUnaffiliated$: Observable<Contact[]>;

  /**
   * A BehaviorSubject of all known contacts. Contains for example Contacts that sent you a message or blocked contacts.
   * This does not represent your roster list.
   */
  contacts$: Observable<Contact[]>;

  /**
   * Returns the contact with the given ID or undefined if no contact with the given ID is found. In case of XMPP it does not have to be
   * bare, the search will convert it to a bare JID.
   *
   * @param id The ID of the contact.
   * @returns Either the Contact or null.
   */
  getContactById(id: string): Promise<Contact | undefined>;

  /**
   * Always returns a contact with the given ID. If no contact exists, a new one is created and announced via contacts$. In case of XMPP
   * it does not have to be bare, the search will convert it to a bare JID.
   *
   * @param id The ID of the contact.
   * @returns The new contact instance.
   */
  getOrCreateContactById(id: string): Promise<Contact>;

  /**
   * Adds the given contact to the user roster. Will send a subscription request to the contact.
   *
   * @param jid The ID of the contact.
   */
  addContact(jid: string): Promise<void>;

  /**
   * Removes the given contact from the user roster. Will cancel a presence subscription from the user to the contact and will retract
   * accepted subscriptions from the contact to the user.
   *
   * @param jid The ID of the contact.
   */
  removeContact(jid: string): Promise<void>;

  blockJid(bareJid: string): Promise<void>;

  unblockJid(bareJid: string): Promise<void>;
}

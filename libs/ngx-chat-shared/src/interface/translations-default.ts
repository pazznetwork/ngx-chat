// SPDX-License-Identifier: AGPL-3.0-or-later
import { Presence } from './presence';
import type { Translations } from './translations';

export function defaultTranslations(): Translations {
  return {
    acceptSubscriptionRequest: 'Accept',
    block: 'Block',
    blockAndReport: 'Block & report',
    chat: 'Chat',
    contactRequestIn: 'Incoming contact requests',
    contactRequestOut: 'Outgoing contact requests',
    contacts: 'Contacts',
    contactsUnaffiliated: 'Unknown',
    dateFormat: 'EEEE, MM/dd/yyyy',
    denySubscriptionRequest: 'Deny',
    dismiss: 'Dismiss',
    dropMessage: 'Drop your file to send it',
    locale: undefined,
    noContacts: 'No contacts yet.',
    noMessages: 'No messages yet.',
    placeholder: 'Enter your message!',
    presence: {
      [Presence.away]: 'Away',
      [Presence.present]: 'Online',
      [Presence.unavailable]: 'Offline',
    },
    rooms: 'Rooms',
    subscriptionRequestMessage: 'I want to add you as a contact.',
    unaffiliatedMessage: 'This conversation started without a contact request',
    timeFormat: 'shortTime',
  };
}
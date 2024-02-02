// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Presence } from './presence';

export interface Translations {
  addUser: string;
  acceptSubscriptionRequest: string;
  block: string;
  blockAndReport: string;
  chat: string;
  contactRequestIn: string;
  contactRequestOut: string;
  contacts: string;
  contactsUnaffiliated: string;
  contactsBlocked: string;
  dateFormat: string;
  dismiss: string;
  dropMessage: string;
  locale?: string;
  noContacts: string;
  noMessages: string;
  placeholder: string;
  presence: { [P in Presence]: string };
  removeContact: string;
  rooms: string;
  subscriptionRequestMessage: string;
  unaffiliatedMessage: string;
  timeFormat: string;
}

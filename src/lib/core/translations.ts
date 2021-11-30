import { Presence } from './presence';

export interface Translations {
    acceptSubscriptionRequest: string;
    block: string;
    blockAndReport: string;
    chat: string;
    contactRequestIn: string;
    contactRequestOut: string;
    contacts: string;
    contactsUnaffiliated: string;
    dateFormat: string;
    denySubscriptionRequest: string;
    dismiss: string;
    dropMessage: string;
    locale: string;
    noContacts: string;
    noMessages: string;
    placeholder: string;
    presence: { [P in Presence]: string; };
    rooms: string;
    subscriptionRequestMessage: string;
    timeFormat: string;
}

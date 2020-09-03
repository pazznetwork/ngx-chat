import { Presence } from './presence';
import { Translations } from './translations';

export function defaultTranslations(): Translations {
    return {
        chat: 'Chat',
        contacts: 'Contacts',
        contactRequestIn: 'Incoming contact requests',
        contactRequestOut: 'Outgoing contact requests',
        contactsUnaffiliated: 'Unknown',
        noContacts: 'No contacts yet.',
        noMessages: 'No messages yet.',
        placeholder: 'Enter your message!',
        subscriptionRequestMessage: 'I want to add you as a contact.',
        acceptSubscriptionRequest: 'Accept',
        denySubscriptionRequest: 'Deny',
        timeFormat: 'shortTime',
        dateFormat: 'EEEE, MM/dd/yyyy',
        locale: undefined,
        dropMessage: 'Drop your file to send it',
        block: 'Block',
        blockAndReport: 'Block & report',
        dismiss: 'Dismiss',
        presence: {
            [Presence.away]: 'Away',
            [Presence.present]: 'Online',
            [Presence.unavailable]: 'Offline',
        },
    };
}

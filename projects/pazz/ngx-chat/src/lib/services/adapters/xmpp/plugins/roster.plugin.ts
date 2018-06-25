import { x as xml } from '@xmpp/xml';
import { Contact, Stanza } from '../../../../core';
import { ContactFactoryService } from '../../../contact-factory.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractPlugin } from './abstract.plugin';

/**
 * https://xmpp.org/rfcs/rfc6121.html#roster-add-success
 */
export class RosterPlugin extends AbstractPlugin {

    constructor(private chatService: XmppChatAdapter, private contactFactory: ContactFactoryService) {
        super();
    }

    private isRosterPushStanza(stanza: Stanza) {
        const queryChild = stanza.getChild('query');
        return stanza.name === 'iq' && stanza.attrs.type === 'set' && queryChild && queryChild.attrs.xmlns === 'jabber:iq:roster';
    }

    handleStanza(stanza: Stanza) {
        if (this.isRosterPushStanza(stanza)) {
            this.handleRosterPushStanza(stanza);
            return true;
        }
        return false;
    }

    private handleRosterPushStanza(stanza: Stanza) {
        const itemChild = stanza.getChild('query').getChild('item');
        const name = itemChild.attrs.name || itemChild.attrs.jid;
        const contactFromPush = this.contactFactory.createContact(itemChild.attrs.jid, name);
        const existingContacts = [].concat(this.chatService.contacts$.getValue()) as Contact[];

        if (itemChild.attrs.subscription === 'remove') {
            this.chatService.contacts$.next(existingContacts.filter(contact => !contact.equalsBareJid(contactFromPush)));
        } else {
            if (existingContacts.filter(contact => contact.equalsBareJid(contactFromPush)).length === 0) {
                this.chatService.contacts$.next(existingContacts.concat(contactFromPush));
            }
        }
    }

    public onBeforeOnline(): PromiseLike<any> {
        return this.refreshRosterContacts();
    }

    getRosterContacts(): Promise<Contact[]> {
        return new Promise((resolve) =>
            this.chatService.chatConnectionService.sendIq(
                xml('iq', {type: 'get'},
                    xml('query', {xmlns: 'jabber:iq:roster'})
                )
            ).then(
                (responseStanza: Stanza) => resolve(this.convertToContacts(responseStanza)),
                () => resolve([])
            )
        );
    }

    private convertToContacts(responseStanza: Stanza): Contact[] {
        return responseStanza.getChild('query').getChildElements()
            .filter(rosterElement => rosterElement.attrs.subscription || rosterElement.attrs.jid)
            .map(rosterElement => this.contactFactory.createContact(
                rosterElement.attrs.jid,
                rosterElement.attrs.name || rosterElement.attrs.jid));
    }

    addRosterContact(jid: string) {
        return this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'jabber:iq:roster'},
                    xml('item', {jid}))));
    }

    removeRosterContact(jid: string) {
        return this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'jabber:iq:roster'},
                    xml('item', {jid, subscription: 'remove'}))));
    }

    refreshRosterContacts() {
        return this.getRosterContacts().then((contacts) => {
            this.chatService.setContacts(contacts);
        });
    }
}

import { x as xml } from '@xmpp/xml';
import { Contact, PresenceStanza, Stanza } from '../../../../core';
import { Presence } from '../../../../core/presence';
import { ContactFactoryService } from '../../../contact-factory.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractPlugin } from './abstract.plugin';

type SubscriptionStatus = 'none' | 'to' | 'from' | 'both' | 'remove';

/**
 * https://xmpp.org/rfcs/rfc6121.html#roster-add-success
 */
export class RosterPlugin extends AbstractPlugin {

    constructor(private chatService: XmppChatAdapter, private contactFactory: ContactFactoryService, private logService: LogService) {
        super();
    }

    handleStanza(stanza: Stanza) {
        if (this.isRosterPushStanza(stanza)) {
            this.handleRosterPushStanza(stanza);
            return true;
        } else if (this.isPresenceStanza(stanza)) {
            return this.handlePresenceStanza(stanza);
        }
        return false;
    }

    private isRosterPushStanza(stanza: Stanza) {
        const queryChild = stanza.getChild('query');
        return stanza.name === 'iq'
            && stanza.attrs.type === 'set'
            && queryChild && queryChild.attrs.xmlns === 'jabber:iq:roster';
    }

    private handleRosterPushStanza(stanza: Stanza) {

        // TODO:
        // Security Warning: Traditionally, a roster push included no 'from' address, with the result that all roster pushes were sent
        // implicitly from the bare JID of the account itself. However, this specification allows entities other than the user's server
        // to maintain roster information, which means that a roster push might include a 'from' address other than the bare JID of the
        // user's account. Therefore, the client MUST check the 'from' address to verify that the sender of the roster push is authorized
        // to update the roster. If the client receives a roster push from an unauthorized entity, it MUST NOT process the pushed data; in
        // addition, the client can either return a stanza error of <service-unavailable/> error or refuse to return a stanza error at all
        // (the latter behavior overrides a MUST-level requirement from [XMPP‑CORE] for the purpose of preventing a presence leak).

        const itemChild = stanza.getChild('query').getChild('item');
        const subscriptionStatus = itemChild.attrs.subscription as SubscriptionStatus || 'none';
        const name = itemChild.attrs.name || itemChild.attrs.jid;
        const contactFromPush = this.contactFactory.createContact(itemChild.attrs.jid, name);
        const existingContacts = [].concat(this.chatService.contacts$.getValue()) as Contact[];

        if (subscriptionStatus === 'remove') {
            this.chatService.contacts$.next(existingContacts.filter(contact => !contact.equalsBareJid(contactFromPush)));
        } else {
            if (existingContacts.filter(contact => contact.equalsBareJid(contactFromPush)).length === 0) {
                this.chatService.contacts$.next(existingContacts.concat(contactFromPush));
            }
        }

        this.chatService.chatConnectionService.send(
            xml('iq', {from: this.chatService.chatConnectionService.myJidWithResource, id: stanza.attrs.id, type: 'result'})
        ).then(() => {}, () => {});
    }

    private isPresenceStanza(stanza: Stanza): stanza is PresenceStanza {
        return stanza.name === 'presence';
    }

    private handlePresenceStanza(stanza: PresenceStanza) {
        const fromAsContact = this.chatService.getContactByJid(stanza.attrs.from);
        const isAddressedToMe = stanza.attrs.to === this.chatService.chatConnectionService.myJidWithResource;
        if (isAddressedToMe) {
            if (!stanza.attrs.type) {
                if (stanza.getChild('show') == null) {
                    // contact available
                    if (fromAsContact) {
                        // TODO: a contact can has more than one presence
                        fromAsContact.presence$.next(Presence.present);
                        return true;
                    }
                } else {
                    // https://xmpp.org/rfcs/rfc3921.html#stanzas-presence-children-show
                    const show = stanza.getChildText('show');
                    if (show === 'away') {
                        // away
                        this.logService.debug('presence of', stanza.attrs.from, 'away');
                    } else if (show === 'chat') {
                        // chat
                        this.logService.debug('presence of', stanza.attrs.from, 'chat');
                    } else if (show === 'dnd') {
                        // do not distrb
                        this.logService.debug('presence of', stanza.attrs.from, 'dnd');
                    } else if (show === 'xa') {
                        // long away
                        this.logService.debug('presence of', stanza.attrs.from, 'xa');
                    } else {
                        // error, undefined
                        this.logService.error('illegal presence:', stanza.attrs.from, show);
                    }
                    return true;
                }
            } else if (stanza.attrs.type === 'subscribe') {
                if (fromAsContact) {
                    // subscriber is already a contact of us, approve subscription
                    this.chatService.chatConnectionService.send(
                        xml('presence', {to: stanza.attrs.from, type: 'subscribed'})
                    );
                } else {
                    // subscriber is not known, add a pending subscription so one can confirm
                    this.chatService.addContactRequestReceived(this.contactFactory.createContact(stanza.attrs.from));
                }
                return true;
            } else  if (stanza.attrs.type === 'unsubscribed') {
                // TODO: handle unsubscriptions
            } else if (stanza.attrs.type === 'unavailable' && fromAsContact) {
                // TODO: a contact can has more than one presence
                fromAsContact.presence$.next(Presence.unavailable);
                return true;
            }
        }
        return false;
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

    addRosterContact(jid: string): void {
        this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'jabber:iq:roster'},
                    xml('item', {jid}))))
            .then(() => {
                // TODO: rethink. shouldn't one first subscribe to another contact and after a successful subscription add the person to
                // the roster?
                return this.chatService.chatConnectionService.send(
                    xml('presence', {id: this.chatService.chatConnectionService.getNextIqId(), to: jid, type: 'subscribe'})
                );
            });
    }

    removeRosterContact(jid: string): void {
        this.chatService.chatConnectionService.sendIq(
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

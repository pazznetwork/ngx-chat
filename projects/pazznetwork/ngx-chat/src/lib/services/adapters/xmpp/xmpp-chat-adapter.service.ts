import { Injectable } from '@angular/core';
import { jid as parseJid } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { ChatPlugin, Contact, Direction, LogInRequest, MessageWithBodyStanza, Stanza, Translations } from '../../../core';
import { dummyAvatar } from '../../../core/contact-avatar';
import { ChatService } from '../../chat-service';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { MessageArchivePlugin } from './plugins';
import { RosterPlugin } from './plugins/roster.plugin';
import { XmppChatConnectionService } from './xmpp-chat-connection.service';

@Injectable()
export class XmppChatAdapter implements ChatService {

    message$ = new Subject<Contact>();
    contacts$ = new BehaviorSubject<Contact[]>([]);
    contactsSubscribed$: Observable<Contact[]> = this.contacts$.pipe(map(contacts => contacts.filter(contact => contact.isSubscribed())));
    contactRequestsReceived$: Observable<Contact[]> = this.contacts$.pipe(map(contacts => contacts.filter(contact => contact.pendingIn)));
    contactRequestsSent$: Observable<Contact[]> = this.contacts$.pipe(map(contacts => contacts.filter(contact => contact.pendingOut)));
    state$ = new BehaviorSubject<'disconnected' | 'connecting' | 'online'>('disconnected');
    plugins: ChatPlugin[] = [];
    rosterPlugin: RosterPlugin;
    messageArchivePlugin: MessageArchivePlugin;
    enableDebugging = false;
    userAvatar$ = new BehaviorSubject(dummyAvatar);
    translations: Translations;

    constructor(public chatConnectionService: XmppChatConnectionService,
                private logService: LogService,
                private contactFactory: ContactFactoryService) {
        this.state$.subscribe((state) => this.logService.debug('state changed to:', state));
        chatConnectionService.state$
            .pipe(filter(nextState => nextState !== this.state$.getValue()))
            .subscribe((nextState) => {
                if (nextState === 'online') {
                    this.state$.next('connecting');
                    Promise.all(this.plugins.map(plugin => plugin.onBeforeOnline()))
                        .then(
                            () => this.announceAvailability(),
                            () => this.announceAvailability()
                        );
                } else {
                    this.state$.next(nextState);
                }
            });
        this.chatConnectionService.stanzaMessage$.subscribe((stanza) => this.onMessageReceived(stanza));
        this.chatConnectionService.stanzaUnknown$.subscribe((stanza) => this.onUnknownStanza(stanza));
    }

    private announceAvailability() {
        this.chatConnectionService.sendPresence();
        this.state$.next('online');
    }

    public addPlugins(plugins: ChatPlugin[]) {
        plugins.forEach(plugin => {
            if (plugin instanceof RosterPlugin) {
                this.rosterPlugin = plugin;
            } else if (plugin instanceof MessageArchivePlugin) {
                this.messageArchivePlugin = plugin;
            }
            this.plugins.push(plugin);
        });
    }

    appendContacts(newContacts: Contact[]) {

        const contactsByJid = {};
        const existingContacts = [].concat(this.contacts$.getValue()) as Contact[];

        for (const newContact of newContacts) {
            contactsByJid[newContact.jidBare.toString()] = newContact;
        }

        for (const existingContact of existingContacts) {
            contactsByJid[existingContact.jidBare.toString()] = existingContact;
        }

        const nextContacts = [];
        for (const jid in contactsByJid) {
            if (contactsByJid.hasOwnProperty(jid)) {
                nextContacts.push(contactsByJid[jid]);
            }
        }

        if (nextContacts.length !== existingContacts.length) {
            this.contacts$.next(nextContacts);
        }

    }

    reloadContacts(): void {
        this.rosterPlugin.refreshRosterContacts();
    }

    getContactById(jidPlain: string) {
        const bareJidToFind = parseJid(jidPlain).bare();
        return this.contacts$.getValue().find(contact => contact.jidBare.equals(bareJidToFind));
    }

    getOrCreateContactById(jidPlain: string) {
        let contact = this.getContactById(jidPlain);
        if (!contact) {
            contact = this.contactFactory.createContact(parseJid(jidPlain).bare().toString());
            this.appendContacts([contact]);
        }
        return contact;
    }

    addContact(identifier: string) {
        this.rosterPlugin.addRosterContact(identifier);
    }

    removeContact(identifier: string) {
        this.rosterPlugin.removeRosterContact(identifier);
    }

    logIn(logInRequest: LogInRequest): void {
        this.chatConnectionService.logIn(logInRequest);
    }

    logOut(): void {
        this.contacts$.next([]);
        this.chatConnectionService.logOut();
    }

    sendMessage(jid: string, body: string) {
        const messageStanza = xml('message', {to: jid, from: this.chatConnectionService.userJid.toString(), type: 'chat'},
            xml('body', {}, body)
        );
        for (const plugin of this.plugins) {
            plugin.beforeSendMessage(messageStanza);
        }
        this.chatConnectionService.send(messageStanza).then(() => {
            const contact = this.getOrCreateContactById(jid);
            const message = {
                direction: Direction.out,
                body,
                datetime: new Date()
            };
            for (const plugin of this.plugins) {
                plugin.afterSendMessage(message, messageStanza);
            }
            contact.appendMessage(message);
            this.message$.next(contact);
        }, (rej) => {
            this.logService.error('rejected', rej);
        });
    }

    loadCompleteHistory() {
        return this.messageArchivePlugin.loadAllMessages();
    }

    private onMessageReceived(messageStanza: MessageWithBodyStanza) {
        this.logService.debug('message received <=', messageStanza.getChildText('body'));
        const contact = this.getOrCreateContactById(messageStanza.attrs.from);

        const message = {
            body: messageStanza.getChildText('body'),
            direction: Direction.in,
            datetime: new Date()
        };

        for (const plugin of this.plugins) {
            plugin.afterReceiveMessage(message, messageStanza);
        }

        contact.appendMessage(message);
        this.message$.next(contact);
    }

    private onUnknownStanza(stanza: Stanza) {

        let handled = false;

        for (const plugin of this.plugins) {
            if (plugin.handleStanza(stanza)) {
                handled = true;
            }
        }

        if (!handled) {
            this.logService.warn('unknown stanza <=', stanza.toString());
        }

    }
}

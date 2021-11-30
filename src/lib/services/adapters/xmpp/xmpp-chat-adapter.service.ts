import { Injectable } from '@angular/core';
import { jid as parseJid } from '@xmpp/client';
import { BehaviorSubject, combineLatest, merge, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ChatActionContext } from '../../../components/chat-window/chat-window.component';
import { Contact } from '../../../core/contact';
import { dummyAvatarContact } from '../../../core/contact-avatar';
import { LogInRequest } from '../../../core/log-in-request';
import { ChatPlugin } from '../../../core/plugin';
import { Recipient } from '../../../core/recipient';
import { Stanza } from '../../../core/stanza';
import { Translations } from '../../../core/translations';
import { defaultTranslations } from '../../../core/translations-default';
import { ChatService, ConnectionStates } from '../../chat-service';
import { ContactFactoryService } from '../../contact-factory.service';
import { LogService } from '../../log.service';
import { MessageArchivePlugin } from './plugins/message-archive.plugin';
import { MessagePlugin } from './plugins/message.plugin';
import { MultiUserChatPlugin } from './plugins/multi-user-chat.plugin';
import { RosterPlugin } from './plugins/roster.plugin';
import { XmppChatConnectionService, XmppChatStates } from './xmpp-chat-connection.service';

@Injectable()
export class XmppChatAdapter implements ChatService {

    readonly message$ = new Subject<Contact>();
    readonly messageSent$: Subject<Contact> = new Subject();

    readonly contacts$ = new BehaviorSubject<Contact[]>([]);
    readonly contactCreated$ = new Subject<Contact>();

    readonly blockedContactIds$ = new BehaviorSubject<Set<string>>(new Set<string>());
    readonly blockedContacts$ = combineLatest([this.contacts$, this.blockedContactIds$])
        .pipe(
            map(
                ([contacts, blockedJids]) =>
                    contacts.filter(contact => blockedJids.has(contact.jidBare.toString())),
            ),
        );
    readonly notBlockedContacts$ = combineLatest([this.contacts$, this.blockedContactIds$])
        .pipe(
            map(
                ([contacts, blockedJids]) =>
                    contacts.filter(contact => !blockedJids.has(contact.jidBare.toString())),
            ),
        );
    readonly contactsSubscribed$: Observable<Contact[]> = this.notBlockedContacts$.pipe(
        map(contacts => contacts.filter(contact => contact.isSubscribed())));
    readonly contactRequestsReceived$: Observable<Contact[]> = this.notBlockedContacts$.pipe(
        map(contacts => contacts.filter(contact => contact.pendingIn$.getValue())));
    readonly contactRequestsSent$: Observable<Contact[]> = this.notBlockedContacts$.pipe(
        map(contacts => contacts.filter(contact => contact.pendingOut$.getValue())));
    readonly contactsUnaffiliated$: Observable<Contact[]> = this.notBlockedContacts$.pipe(
        map(contacts => contacts.filter(contact => contact.isUnaffiliated() && contact.messages.length > 0)));
    readonly state$ = new BehaviorSubject<ConnectionStates>('disconnected');
    readonly plugins: ChatPlugin[] = [];
    enableDebugging = false;
    readonly userAvatar$ = new BehaviorSubject(dummyAvatarContact);
    translations: Translations = defaultTranslations();

    chatActions = [{
        id: 'sendMessage',
        cssClass: 'chat-window-send',
        html: '&raquo;',
        onClick: (chatActionContext: ChatActionContext) => {
            chatActionContext.chatWindow.sendMessage();
        },
    }];

    private lastLogInRequest: LogInRequest;

    constructor(
        public chatConnectionService: XmppChatConnectionService,
        private logService: LogService,
        private contactFactory: ContactFactoryService,
    ) {
        this.state$.subscribe((state) => this.logService.info('state changed to:', state));
        chatConnectionService.state$
            .pipe(filter(nextState => nextState !== this.state$.getValue()))
            .subscribe((nextState) => {
                this.handleInternalStateChange(nextState);
            });
        this.chatConnectionService.stanzaUnknown$.subscribe((stanza) => this.onUnknownStanza(stanza));

        merge(this.messageSent$, this.message$).subscribe(() => {
            // re-emit contacts when sending or receiving a message to refresh contcat groups
            // if the sending contact was in 'other', he still is in other now, but passes the 'messages.length > 0' predicate, so that
            // he should be seen now.
            this.contacts$.next(this.contacts$.getValue());
        });
    }

    private handleInternalStateChange(internalState: XmppChatStates) {
        if (internalState === 'online') {
            this.state$.next('connecting');
            Promise.all(this.plugins.map(plugin => plugin.onBeforeOnline()))
                .then(
                    () => this.announceAvailability(),
                    (e) => {
                        this.logService.error('error while connecting', e);
                        this.announceAvailability();
                    },
                );
        } else {
            if (this.state$.getValue() === 'online') {
                // clear data the first time we transition to a not-online state
                this.onOffline();
            }
            this.state$.next('disconnected');
        }
    }

    private onOffline() {
        this.contacts$.next([]);
        this.plugins.forEach(plugin => {
            try {
                plugin.onOffline();
            } catch (e) {
                this.logService.error('error while handling offline in ', plugin);
            }
        });
    }

    private announceAvailability() {
        this.logService.info('announcing availability');
        this.chatConnectionService.sendPresence();
        this.state$.next('online');
    }

    addPlugins(plugins: ChatPlugin[]) {
        plugins.forEach(plugin => {
            this.plugins.push(plugin);
        });
    }

    reloadContacts(): void {
        this.getPlugin(RosterPlugin).refreshRosterContacts();
    }

    getContactById(jidPlain: string) {
        const bareJidToFind = parseJid(jidPlain).bare();
        return this.contacts$.getValue().find(contact => contact.jidBare.equals(bareJidToFind));
    }

    getOrCreateContactById(jidPlain: string, name?: string) {
        let contact = this.getContactById(jidPlain);
        if (!contact) {
            contact = this.contactFactory.createContact(parseJid(jidPlain).bare().toString(), name);
            this.contacts$.next([contact, ...this.contacts$.getValue()]);
            this.contactCreated$.next(contact);
        }
        return contact;
    }

    addContact(identifier: string) {
        this.getPlugin(RosterPlugin).addRosterContact(identifier);
    }

    removeContact(identifier: string) {
        this.getPlugin(RosterPlugin).removeRosterContact(identifier);
    }

    async logIn(logInRequest: LogInRequest) {
        this.lastLogInRequest = logInRequest;
        if (this.state$.getValue() === 'disconnected') {
            await this.chatConnectionService.logIn(logInRequest);
        }
    }

    logOut(): Promise<void> {
        return this.chatConnectionService.logOut();
    }

    async sendMessage(recipient: Recipient, body: string) {
        const trimmedBody = body.trim();
        if (trimmedBody.length === 0) {
            return;
        }
        switch (recipient.recipientType) {
            case 'room':
                await this.getPlugin(MultiUserChatPlugin).sendMessage(recipient, trimmedBody);
                break;
            case 'contact':
                this.getPlugin(MessagePlugin).sendMessage(recipient, trimmedBody);
                this.messageSent$.next(recipient);
                break;
            default:
                throw new Error('invalid recipient type: ' + (recipient as any)?.recipientType);
        }
    }

    loadCompleteHistory() {
        return this.getPlugin(MessageArchivePlugin).loadAllMessages();
    }

    getPlugin<T extends ChatPlugin>(constructor: new(...args: any[]) => T): T {
        for (const plugin of this.plugins) {
            if (plugin.constructor === constructor) {
                return plugin as T;
            }
        }
        throw new Error('plugin not found: ' + constructor);
    }

    private onUnknownStanza(stanza: Stanza) {

        let handled = false;

        for (const plugin of this.plugins) {
            try {
                if (plugin.handleStanza(stanza)) {
                    this.logService.debug(plugin.constructor.name, 'handled', stanza.toString());
                    handled = true;
                }
            } catch (e) {
                this.logService.error('error handling stanza in ', plugin.constructor.name, e);
            }
        }

        if (!handled) {
            this.logService.warn('unknown stanza <=', stanza.toString());
        }

    }

    reconnectSilently(): void {
        this.chatConnectionService.reconnectSilently();
    }

    reconnect() {
        return this.logIn(this.lastLogInRequest);
    }

}

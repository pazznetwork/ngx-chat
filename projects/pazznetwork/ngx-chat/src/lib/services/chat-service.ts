import { InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatAction } from '../components/chat-window/chat-window.component';
import { Contact } from '../core/contact';
import { LogInRequest } from '../core/log-in-request';
import { ChatPlugin } from '../core/plugin';
import { Recipient } from '../core/recipient';
import { Translations } from '../core/translations';

export const ChatServiceToken = new InjectionToken('pazznetworkNgxChatService');


export type ConnectionStates = 'disconnected' | 'connecting' | 'online';

/**
 * ChatService is your main API for using ngx-chat. Can be injected in your services like in the following example:
 *
 * ```
 * constructor(@Inject(ChatServiceToken) chatService: ChatService)
 * ```
 */
export interface ChatService {

    /**
     * Will emit the corresponding contact when a new message arrive.
     */
    message$: Observable<Contact>;

    /**
     * Lifecycle state machine. Starts in the state "disconnected". When logging in, the state will change to "connecting".
     * Plugins may now initialize, for example load the contact list or request archived messages. When all plugins have completed the
     * initialization, the new state will be 'online'.
     */
    state$: BehaviorSubject<ConnectionStates>;

    /**
     * A BehaviorSubject of all known contacts. Contains for example Contacts that sent you a message or blocked contacts.
     * This does not represent your roster list.
     */
    contacts$: BehaviorSubject<Contact[]>;

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
     * A list of contacts where the user is not subscribed to and neither a pending request is incoming or outgoing.
     */
    contactsUnaffiliated$: Observable<Contact[]>;

    /**
     * If set to true, debug information will be visible in the roster list.
     */
    enableDebugging: boolean;

    /**
     * The avatar of the user. Is used as src attribute of an img-element. Purely cosmetical. Should be set via the
     * [userAvatar$]{@link ChatComponent#userAvatar$} @Input-attribute of {@link ChatComponent}.
     */
    userAvatar$: BehaviorSubject<string>;

    /**
     * The current translation. Do NOT write to this attribute, use the [translations]{@link ChatComponent#translations} @Input-attribute
     * of {@link ChatComponent} instead.
     */
    translations: Translations;

    /**
     * The actions visible to users near to chat inputs, e.g. the send message button. Customize it for branding or to add
     * new actions, e.g. for file uploads.
     */
    chatActions: ChatAction[];

    /**
     * Forces asynchronous reloading of your roster list from the server, {@link contacts$} will reflect this.
     */
    reloadContacts(): void;

    /**
     * Returns the contact with the given ID or undefined if no contact with the given ID is found. In case of XMPP it does not have to be
     * bare, the search will convert it to a bare JID.
     * @param id The ID of the contact.
     * @returns Either the Contact or undefined.
     */
    getContactById(id: string): Contact | undefined;

    /**
     * Always returns a contact with the given ID. If no contact exists, a new one is created and announced via contacts$. In case of XMPP
     * it does not have to be bare, the search will convert it to a bare JID.
     * @param id The ID of the contact.
     * @returns The new contact instance.
     */
    getOrCreateContactById(id: string): Contact;

    /**
     * Adds the given contact to the user roster. Will send a subscription request to the contact.
     * @param identifier The ID of the contact.
     */
    addContact(identifier: string): void;

    /**
     * Removes the given cotnact from the user roster. Will cancel a presence subscription from the user to the contact and will retract
     * accepted subscriptions from the contact to the user.
     * @param identifier The ID of the contact.
     */
    removeContact(identifier: string): void;

    /**
     * Logs the user in. Will modify state$ accordingly. If login fails, state will stay in 'disconnected'.
     */
    logIn(logInRequest: LogInRequest): void;

    /**
     * Disconnects from the server, clears contacts$, sets state$ to 'disconnected'.
     */
    logOut(): void;

    /**
     * Sends a given message to a given contact.
     * @param recipient The recipient to which the message shall be sent.
     * @param body The message content.
     */
    sendMessage(recipient: Recipient, body: string): void;

    /**
     * Requests all archived messages for all contacts from the server.
     */
    loadCompleteHistory(): Promise<void>;

    /**
     * Returns the plugin instance for the given constructor
     * @param constructor The plugin constructor, e.g. {@link RosterPlugin}
     */
    getPlugin<T extends ChatPlugin>(constructor: new(...args: any[]) => T): T;

    /**
     * Tries to transparently (= without the user noticing) reconnect to the chat server.
     */
    reconnectSilently(): void;

    /**
     * Tries to reconnect with the same credentials the user logged in last.
     */
    reconnect(): void;

}

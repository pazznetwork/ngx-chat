import { InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Contact, LogInRequest } from '../core';

export const ChatServiceToken = new InjectionToken('PazzNgxChatService');

export interface ChatService {

    message$: Subject<Contact>;
    state$: BehaviorSubject<'disconnected' | 'connecting' | 'online'>;
    contacts$: BehaviorSubject<Contact[]>;
    contactsSubscribed$: Observable<Contact[]>;
    contactRequestsSent$: Observable<Contact[]>;
    contactRequestsReceived$: Observable<Contact[]>;
    enableDebugging: boolean;

    setContacts(newContacts: Contact[]): void;

    reloadContacts(): void;

    getContactByJid(jidPlain: string): Contact;

    addContact(identifier: string): void;

    removeContact(identifier: string): void;

    logIn(logInRequest: LogInRequest): void;

    logOut(): void;

    sendMessage(jid: string, body: string): void;

}

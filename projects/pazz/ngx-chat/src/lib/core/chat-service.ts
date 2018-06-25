import { InjectionToken } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Contact } from './contact';
import { LogInRequest } from './log-in-request';

export const ChatServiceToken = new InjectionToken('PazzNgxChatService');

export interface ChatService {

    message$: Subject<Contact>;
    contacts$: BehaviorSubject<Contact[]>;
    state$: BehaviorSubject<'disconnected' | 'connecting' | 'online'>;

    setContacts(newContacts: Contact[]): void;

    reloadContacts(): void;

    getContactByJid(jidPlain: string): Contact;

    addContact(identifier: string): void;

    removeContact(identifier: string): void;

    logIn(logInRequest: LogInRequest): void;

    logOut(): void;

    sendMessage(jid: string, body: string): void;

}

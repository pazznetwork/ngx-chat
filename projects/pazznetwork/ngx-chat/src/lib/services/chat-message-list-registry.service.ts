import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Contact } from '../core/contact';

/**
 * Used to determine if a message component for a given contact is open.
 */
@Injectable({
    providedIn: 'root'
})
export class ChatMessageListRegistryService {

    public openChats$ = new BehaviorSubject<Set<Contact>>(new Set());
    public chatOpened$ = new Subject<Contact>();
    private contactToOpenMessageListCount = new Map<Contact, number>();

    constructor() {
    }

    isChatOpen(contact: Contact) {
        return this.getOrDefault(contact, 0) > 0;
    }

    incrementOpenWindowCount(contact: Contact) {
        const wasWindowOpen = this.isChatOpen(contact);
        this.contactToOpenMessageListCount.set(contact, this.getOrDefault(contact, 0) + 1);
        const openWindowSet = this.openChats$.getValue();
        openWindowSet.add(contact);
        this.openChats$.next(openWindowSet);
        if (!wasWindowOpen) {
            this.chatOpened$.next(contact);
        }
    }

    decrementOpenWindowCount(contact: Contact) {
        const newValue = this.getOrDefault(contact, 0) - 1;
        if (newValue <= 0) {
            this.contactToOpenMessageListCount.set(contact, 0);
            const openWindowSet = this.openChats$.getValue();
            openWindowSet.delete(contact);
            this.openChats$.next(openWindowSet);
        } else {
            this.contactToOpenMessageListCount.set(contact, newValue);
        }
    }

    private getOrDefault(contact: Contact, defaultValue: number) {
        return this.contactToOpenMessageListCount.get(contact) || defaultValue;
    }

}

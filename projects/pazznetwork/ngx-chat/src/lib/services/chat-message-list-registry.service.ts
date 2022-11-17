import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Recipient } from '../core/recipient';

/**
 * Used to determine if a message component for a given recipient is open.
 */
@Injectable()
export class ChatMessageListRegistryService {

    public openChats$ = new BehaviorSubject<Set<Recipient>>(new Set());
    public chatOpened$ = new Subject<Recipient>();
    private recipientToOpenMessageListCount = new Map<Recipient, number>();

    constructor() {
    }

    isChatOpen(recipient: Recipient) {
        return this.getOrDefault(recipient, 0) > 0;
    }

    incrementOpenWindowCount(recipient: Recipient) {
        const wasWindowOpen = this.isChatOpen(recipient);
        this.recipientToOpenMessageListCount.set(recipient, this.getOrDefault(recipient, 0) + 1);
        const openWindowSet = this.openChats$.getValue();
        openWindowSet.add(recipient);
        this.openChats$.next(openWindowSet);
        if (!wasWindowOpen) {
            this.chatOpened$.next(recipient);
        }
    }

    decrementOpenWindowCount(recipient: Recipient) {
        const newValue = this.getOrDefault(recipient, 0) - 1;
        if (newValue <= 0) {
            this.recipientToOpenMessageListCount.set(recipient, 0);
            const openWindowSet = this.openChats$.getValue();
            openWindowSet.delete(recipient);
            this.openChats$.next(openWindowSet);
        } else {
            this.recipientToOpenMessageListCount.set(recipient, newValue);
        }
    }

    private getOrDefault(recipient: Recipient, defaultValue: number) {
        return this.recipientToOpenMessageListCount.get(recipient) || defaultValue;
    }

}

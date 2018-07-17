import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';

import { Contact, Translations } from '../core';
import { ChatService, ChatServiceToken } from '../services/chat-service';

/**
 * The main UI component. Should be instantiated near the root of your application.
 *
 * ```html
 * <!-- plain usage, no configuration -->
 * <ngx-chat></ngx-chat>
 *
 * <!-- if supplied, translations contain an object with the structure of the Translations interface. -->
 * <ngx-chat translations="{'contacts': 'Kontakte', ...}"></ngx-chat>
 *
 * <!-- if supplied, the contacts input attribute takes an Observable<Contact[]> as source for your roster list -->
 * <ngx-chat contacts="..."></ngx-chat>
 *
 * <!-- if supplied, userAvatar$ contains an Obervable<string>, which is used as the src attribute of the img for the current user. -->
 * <ngx-chat userAvatar$="Observable.of('http://...')"></ngx-chat>
 * ```
 */
@Component({
    selector: 'ngx-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.less']
})
export class ChatComponent implements OnInit, OnChanges {

    /**
     * If supplied, translations contain an object with the structure of the Translations interface.
     */
    @Input()
    public translations: Translations = {
        'contacts': 'Contacts',
        'noMessages': 'No messages yet.',
        'placeholder': 'Enter your message!',
        'subscriptionRequestMessage': 'I want to add you as a contact.',
        'acceptSubscriptionRequest': 'Accept',
        'denySubscriptionRequest': 'Deny'
    };

    /**
     * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your roster list.
     */
    @Input()
    public contacts: undefined | Observable<Contact[]>;

    /**
     * If supplied, userAvatar$ contains an Obervable<string>, which is used as the src attribute of the img for the current user.
     */
    @Input()
    public userAvatar$: undefined | Observable<string>;

    showChatComponent = false;
    rosterState = 'hidden';

    constructor(@Inject(ChatServiceToken) private chatService: ChatService) {
    }

    ngOnInit() {
        this.chatService.state$.subscribe($e => this.onChatStateChange($e));
        const rosterState = localStorage.getItem('pazzNgxChatRosterState') || 'hidden';
        this.onRosterStateChanged(rosterState);

        if (this.userAvatar$) {
            this.userAvatar$.subscribe(avatar => this.chatService.userAvatar$.next(avatar));
        }

        this.chatService.translations = this.translations;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.translations) {
            this.chatService.translations = this.translations;
        }
    }

    private onChatStateChange(state: string) {
        this.showChatComponent = state === 'online';
        this.updateBodyClass();
    }

    onRosterStateChanged(state: string) {
        localStorage.setItem('pazzNgxChatRosterState', state);
        this.rosterState = state;
        this.updateBodyClass();
    }

    private updateBodyClass() {
        const rosterClass = 'has-roster';
        if (this.showChatComponent && this.rosterState !== 'hidden') {
            document.body.classList.add(rosterClass);
        } else {
            document.body.classList.remove(rosterClass);
        }
    }

}

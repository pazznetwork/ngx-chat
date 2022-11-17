import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { Contact } from '../core/contact';
import { Translations } from '../core/translations';
import { defaultTranslations } from '../core/translations-default';
import { CHAT_SERVICE_TOKEN, ChatService } from '../services/chat-service';

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
    styleUrls: ['./chat.component.less'],
})
export class ChatComponent implements OnInit, OnChanges {

    /**
     * If supplied, translations contain an object with the structure of the Translations interface.
     */
    @Input()
    public set translations(translations: Partial<Translations>) {
        const defaultTranslation = defaultTranslations();
        if (translations) {
            this.chatService.translations = {
                ...defaultTranslation,
                ...translations,
                presence: {
                    ...defaultTranslation.presence,
                    ...translations.presence,
                },
            };
        }
    }

    /**
     * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your roster list.
     */
    @Input()
    public contacts?: Observable<Contact[]>;

    /**
     * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your incoming contact
     * requests list.
     */
    @Input()
    contactRequestsReceived$?: Observable<Contact[]>;

    /**
     * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your outgoing contact
     * requests list.
     */
    @Input()
    contactRequestsSent$?: Observable<Contact[]>;

    /**
     * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your unaffiliated contact
     * list.
     */
    @Input()
    contactsUnaffiliated$?: Observable<Contact[]>;

    /**
     * If supplied, userAvatar$ contains an Observable<string>, which is used as the src attribute of the img for the current user.
     */
    @Input()
    public userAvatar$?: Observable<string>;

    /**
     * 'shown' shows roster list, 'hidden' hides it.
     */
    @Input()
    rosterState: 'shown' | 'hidden';

    showChatComponent = false;

    constructor(
        @Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService,
    ) {
    }

    ngOnInit() {
        this.chatService.state$.subscribe($e => this.onChatStateChange($e));
        this.onRosterStateChanged(this.rosterState);

        if (this.userAvatar$) {
            this.userAvatar$.subscribe(avatar => this.chatService.userAvatar$.next(avatar));
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.rosterState) {
            this.onRosterStateChanged(changes.rosterState.currentValue);
        }
    }

    private onChatStateChange(state: string) {
        this.showChatComponent = state === 'online';
        this.updateBodyClass();
    }

    onRosterStateChanged(state: 'shown' | 'hidden') {
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

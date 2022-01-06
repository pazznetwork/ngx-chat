import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Contact } from '../../core/contact';
import { Recipient } from '../../core/recipient';
import { MultiUserChatPlugin } from '../../services/adapters/xmpp/plugins/multi-user-chat.plugin';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { CHAT_SERVICE_TOKEN, ChatService } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-roster-list',
    templateUrl: './roster-list.component.html',
    styleUrls: ['./roster-list.component.less'],
    animations: [
        trigger('rosterVisibility', [
            state('hidden', style({
                right: '-14em',
            })),
            state('shown', style({
                right: '0em',
            })),
            transition('hidden => shown', animate('400ms ease')),
            transition('shown => hidden', animate('400ms ease')),
        ]),
        trigger('drawerVisibility', [
            state('hidden', style({
                right: '0em',
            })),
            state('shown', style({
                right: '14em',
            })),
            transition('hidden => shown', animate('400ms ease')),
            transition('shown => hidden', animate('400ms ease')),
        ]),
    ],
})
export class RosterListComponent implements OnInit {

    @Input()
    rosterState: 'hidden' | 'shown';

    @Input()
    contacts: Observable<Contact[]>;

    @Input()
    contactRequestsReceived$: Observable<Contact[]>;

    @Input()
    contactRequestsSent$: Observable<Contact[]>;

    @Input()
    contactsUnaffiliated$: Observable<Contact[]>;

    hasNoContacts$: Observable<boolean>;

    @Output()
    rosterStateChanged = new EventEmitter<'hidden' | 'shown'>();

    multiUserChatPlugin: MultiUserChatPlugin;

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
                private chatListService: ChatListStateService) {
        this.multiUserChatPlugin = this.chatService.getPlugin(MultiUserChatPlugin);
    }

    ngOnInit() {
        if (!this.contacts) {
            this.contacts = this.chatService.contactsSubscribed$;
        }
        if (!this.contactRequestsReceived$) {
            this.contactRequestsReceived$ = this.chatService.contactRequestsReceived$;
        }
        if (!this.contactRequestsSent$) {
            this.contactRequestsSent$ = this.chatService.contactRequestsSent$;
        }
        if (!this.contactsUnaffiliated$) {
            this.contactsUnaffiliated$ = this.chatService.contactsUnaffiliated$;
        }
        this.hasNoContacts$ = combineLatest([
            this.contacts,
            this.contactRequestsReceived$,
            this.contactRequestsSent$,
            this.contactsUnaffiliated$,
        ]).pipe(
            map(([contacts, received, sent, unaffiliated]) =>
                contacts.length + received.length + sent.length + unaffiliated.length === 0),
        );
    }

    onClickRecipient(recipient: Recipient) {
        this.chatListService.openChat(recipient);
    }

    toggleVisibility() {
        const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
        this.rosterStateChanged.emit(newState);
    }

}

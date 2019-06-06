import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Contact } from '../../core';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

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
            transition('shown => hidden', animate('400ms ease'))
        ]),
        trigger('drawerVisibility', [
            state('hidden', style({
                right: '0em',
            })),
            state('shown', style({
                right: '14em',
            })),
            transition('hidden => shown', animate('400ms ease')),
            transition('shown => hidden', animate('400ms ease'))
        ])
    ]
})
export class RosterListComponent implements OnInit {

    @Input()
    rosterState: string;

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
    rosterStateChanged: EventEmitter<string> = new EventEmitter<string>();

    constructor(@Inject(ChatServiceToken) public chatService: ChatService,
                private chatListService: ChatListStateService) {
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
            map(([contacts, received, sent, unaffiliated]) => contacts.length + received.length + sent.length + unaffiliated.length === 0)
        );
    }

    onClickContact(contact: Contact) {
        this.chatListService.openChat(contact);
    }

    toggleVisibility() {
        const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
        this.rosterStateChanged.emit(newState);
    }

}

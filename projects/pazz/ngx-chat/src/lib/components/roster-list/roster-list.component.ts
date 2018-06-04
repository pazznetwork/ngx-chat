import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Contact, Translations } from '../../core/index';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatService } from '../../services/chat.service';

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
    public translations: Translations;

    @Input()
    rosterState: string;

    @Output()
    rosterStateChanged: EventEmitter<string> = new EventEmitter<string>();

    protected contacts: Contact[] = [];

    constructor(public chatService: ChatService,
                private chatListService: ChatListStateService) {
    }

    ngOnInit() {
    }

    onClickContact(contact: Contact) {
        this.chatListService.openChat(contact.jidPlain);
    }

    toggleVisibility() {
        const newState = this.rosterState === 'shown' ? 'hidden' : 'shown';
        this.rosterStateChanged.emit(newState);
    }

}

import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Translations } from '../../core';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatService } from '../../services/chat.service';

@Component({
    selector: 'pz-chat-list',
    templateUrl: './chat-list.component.html',
    styleUrls: ['./chat-list.component.less'],
    animations: [
        trigger('rosterVisibility', [
            state('hidden', style({
                right: '1em',
            })),
            state('shown', style({
                right: '15em',
            })),
            transition('hidden => shown', animate('400ms ease')),
            transition('shown => hidden', animate('400ms ease'))
        ])
    ]
})
export class ChatListComponent implements OnInit {

    @Input()
    public translations: Translations;

    @Input()
    rosterState: string;

    private messageSubscription: Subscription;

    constructor(public chatListService: ChatListStateService,
                private chatService: ChatService) {
    }

    public ngOnInit() {
        this.messageSubscription = this.chatService.message$.subscribe(contact => {
            this.chatListService.openChat(contact.jidPlain);
        });
    }

}

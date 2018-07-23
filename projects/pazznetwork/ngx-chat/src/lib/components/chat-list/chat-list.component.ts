import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Inject, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Direction } from '../../core';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-list',
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
    rosterState: string;

    private messageSubscription: Subscription;

    constructor(public chatListService: ChatListStateService,
                @Inject(ChatServiceToken) private chatService: ChatService) {
    }

    public ngOnInit() {
        this.messageSubscription = this.chatService.message$
            .pipe(filter(contact => contact.messages[contact.messages.length - 1].direction === Direction.in))
            .subscribe(contact => {
                this.chatListService.openChat(contact);
            });
    }

}

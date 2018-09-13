import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Direction } from '../../core';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-window-list',
    templateUrl: './chat-window-list.component.html',
    styleUrls: ['./chat-window-list.component.less'],
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
export class ChatWindowListComponent implements OnInit, OnDestroy {

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

    ngOnDestroy(): void {
        this.messageSubscription.unsubscribe();
    }

}

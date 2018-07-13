import {Component, Inject, Input, OnDestroy, OnInit} from '@angular/core';
import {from, Subscription} from 'rxjs';
import {ChatListStateService, ChatWindowState} from '../../services/chat-list-state.service';
import {ChatService, ChatServiceToken} from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-window',
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.less']
})
export class ChatWindowComponent implements OnInit, OnDestroy {

    @Input()
    public chatWindowState: ChatWindowState;

    @Input()
    public isCollapsed: boolean;

    private subscriptions: Subscription[] = [];

    constructor(@Inject(ChatServiceToken) private chatService: ChatService,
                private chatListService: ChatListStateService) {
    }

    ngOnInit() {
        this.subscriptions.push(this.chatWindowState.contact.messages$.subscribe(() => {
            this.chatWindowState.isCollapsed = false;
        }));
    }


    ngOnDestroy() {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    public onClickHeader() {
        this.chatWindowState.isCollapsed = !this.chatWindowState.isCollapsed;
    }

    public onClickClose() {
        this.chatListService.closeChat(this.chatWindowState.contact);
    }

}

import { Component, ElementRef, Inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { Translations } from '../../core';
import { ChatListStateService, ChatWindowState } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-window',
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.less']
})
export class ChatWindowComponent implements OnInit, OnDestroy {

    @Input()
    public translations: Translations;

    @Input()
    public chatWindowState: ChatWindowState;

    @Input()
    public isCollapsed: boolean;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    public message = '';

    private subscriptions: Subscription[] = [];

    constructor(@Inject(ChatServiceToken) private chatService: ChatService,
                private chatListService: ChatListStateService) {
    }

    ngOnInit() {
        this.subscriptions.push(this.chatWindowState.contact.messages$.subscribe(() => {
            this.chatWindowState.isCollapsed = false;
            this.scheduleScrollToLastMessage();
        }));
        this.scheduleScrollToLastMessage();
    }

    private scheduleScrollToLastMessage() {
        setTimeout(() => this.scrollToLastMessage(), 0);
    }

    private scrollToLastMessage() {
        this.chatMessageAreaElement.nativeElement.scrollTop = this.chatMessageAreaElement.nativeElement.scrollHeight;
    }

    ngOnDestroy() {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    public onClickHeader() {
        this.chatWindowState.isCollapsed = !this.chatWindowState.isCollapsed;
        if (!this.chatWindowState.isCollapsed) {
            this.scheduleScrollToLastMessage();
        }
    }

    public onSendMessage() {
        if (this.message.trim().length > 0) {
            this.chatService.sendMessage(this.chatWindowState.contact.jidPlain, this.message);
            this.message = '';
        }
    }

    public onClickClose() {
        this.chatListService.closeChat(this.chatWindowState.contact);
    }

}

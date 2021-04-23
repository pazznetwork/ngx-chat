import { Component, Inject, Input, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Direction, Message } from '../../core/message';
import { Presence } from '../../core/presence';
import { HttpFileUploadPlugin } from '../../services/adapters/xmpp/plugins/http-file-upload.plugin';
import { RoomMessage } from '../../services/adapters/xmpp/plugins/multi-user-chat.plugin';
import { ChatContactClickHandler, CONTACT_CLICK_HANDLER_TOKEN } from '../../services/chat-contact-click-handler';
import { ChatListStateService, ChatWindowState } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';
import { ChatMessageInputComponent } from '../chat-message-input/chat-message-input.component';
import { ChatMessageListComponent } from '../chat-message-list/chat-message-list.component';
import { ChatRoomMessagesComponent } from '../chat-room-messages/chat-room-messages.component';

@Component({
    selector: 'ngx-chat-window',
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.less'],
})
export class ChatWindowComponent implements OnInit, OnDestroy {

    @Input()
    public chatWindowState: ChatWindowState;

    @ViewChild(ChatMessageInputComponent)
    messageInput: ChatMessageInputComponent;

    // deduplicate in #62
    @ViewChild(ChatMessageListComponent)
    contactMessageList: ChatMessageListComponent;

    // deduplicate in #62
    @ViewChild(ChatRoomMessagesComponent)
    roomMessageList: ChatRoomMessagesComponent;

    httpFileUploadPlugin: HttpFileUploadPlugin;

    Presence = Presence;

    private ngDestroy = new Subject<void>();

    constructor(
        @Inject(ChatServiceToken) public chatService: ChatService,
        private chatListService: ChatListStateService,
        @Inject(CONTACT_CLICK_HANDLER_TOKEN) @Optional() public contactClickHandler: ChatContactClickHandler,
    ) {
        this.httpFileUploadPlugin = this.chatService.getPlugin(HttpFileUploadPlugin);
    }

    ngOnInit() {
        const messages$: Observable<RoomMessage | Message> = this.chatWindowState.recipient.messages$;
        messages$
            .pipe(
                filter(message => message.direction === Direction.in),
                takeUntil(this.ngDestroy),
            )
            .subscribe(() => {
                this.chatWindowState.isCollapsed = false;
            });
    }

    ngOnDestroy() {
        this.ngDestroy.next();
        this.ngDestroy.complete();
    }

    public onClickHeader() {
        this.chatWindowState.isCollapsed = !this.chatWindowState.isCollapsed;
    }

    public onClickClose() {
        this.chatListService.closeChat(this.chatWindowState.recipient);
    }

    sendMessage() {
        this.messageInput.onSendMessage();
    }

    afterSendMessage() {
        if (this.contactMessageList) { // TODO: remove if after #62
            this.contactMessageList.scheduleScrollToLastMessage();
        }
        if (this.roomMessageList) {
            this.roomMessageList.scheduleScrollToLastMessage();
        }
    }

    async uploadFile(file: File) {
        const url = await this.httpFileUploadPlugin.upload(file);
        this.chatService.sendMessage(this.chatWindowState.recipient, url);
    }

    onFocus() {
        this.messageInput.focus();
    }

    onActionClick(chatAction: ChatAction) {
        chatAction.onClick({
            contact: this.chatWindowState.recipient.jidBare.toString(),
            chatWindow: this,
        });
    }

    onContactClick($event: MouseEvent) {
        if (this.contactClickHandler && !this.chatWindowState.isCollapsed) {
            $event.stopPropagation();
            this.contactClickHandler.onClick(this.chatWindowState.recipient);
        }
    }
}

export interface ChatAction {
    cssClass: { [className: string]: boolean } | string | string[];
    /**
     * to identify actions
     */
    id: string;
    html: string;

    onClick(chatActionContext: ChatActionContext): void;
}

export interface ChatActionContext {
    contact: string;
    chatWindow: ChatWindowComponent;
}

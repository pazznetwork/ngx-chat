import { Component, Inject, Input, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Direction, Message } from '../../core/message';
import { ChatContactClickHandler, CONTACT_CLICK_HANDLER_TOKEN } from '../../hooks/chat-contact-click-handler';
import { ChatListStateService, ChatWindowState } from '../../services/chat-list-state.service';
import { CHAT_SERVICE_TOKEN, ChatService } from '../../services/chat-service';
import { ChatMessageInputComponent } from '../chat-message-input/chat-message-input.component';
import { ChatMessageListComponent } from '../chat-message-list/chat-message-list.component';
import {FILE_UPLOAD_HANDLER_TOKEN, FileUploadHandler} from '../../hooks/file-upload-handler';
import { RoomMessage } from '../../services/adapters/xmpp/plugins/multi-user-chat/room.message';

@Component({
    selector: 'ngx-chat-window',
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.less'],
})
export class ChatWindowComponent implements OnInit, OnDestroy {

    @Input()
    public chatWindowState: ChatWindowState;

    @ViewChild(ChatMessageInputComponent)
    private readonly messageInput: ChatMessageInputComponent;

    @ViewChild(ChatMessageListComponent)
    private readonly contactMessageList: ChatMessageListComponent;

    private readonly ngDestroy = new Subject<void>();

    constructor(
        @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
        private readonly chatListService: ChatListStateService,
        @Inject(FILE_UPLOAD_HANDLER_TOKEN) readonly fileUploadHandler: FileUploadHandler,
        @Inject(CONTACT_CLICK_HANDLER_TOKEN) @Optional() readonly contactClickHandler: ChatContactClickHandler,
    ) {
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
        this.contactMessageList.scheduleScrollToLastMessage();
    }

    async uploadFile(file: File) {
        const url = await this.fileUploadHandler.upload(file);
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

import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Direction } from '../../core';
import { HttpFileUploadPlugin } from '../../services/adapters/xmpp/plugins/http-file-upload.plugin';
import { ChatListStateService, ChatWindowState } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-window',
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.less']
})
export class ChatWindowComponent implements OnInit, OnDestroy {

    @Input()
    public chatWindowState: ChatWindowState;

    private ngDestroy = new Subject<void>();

    constructor(
        @Inject(ChatServiceToken) public chatService: ChatService,
        private chatListService: ChatListStateService,
    ) {}

    ngOnInit() {
        this.chatWindowState.contact.messages$
            .pipe(
                filter(message => message.direction === Direction.in),
                takeUntil(this.ngDestroy)
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
        this.chatListService.closeChat(this.chatWindowState.contact);
    }

    async onFileUpload(file: File) {
        const url = await this.chatService.getPlugin(HttpFileUploadPlugin).upload(file);
        this.chatService.sendMessage(this.chatWindowState.contact.jidBare.toString(), url);
    }
}

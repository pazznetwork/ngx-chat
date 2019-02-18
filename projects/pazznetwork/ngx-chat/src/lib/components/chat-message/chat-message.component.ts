import { HttpClient } from '@angular/common/http';
import { Component, Inject, Input, OnInit } from '@angular/core';
import { Message } from '../../core';
import { extractUrls } from '../../core/utils-links';
import { XmppChatAdapter } from '../../services/adapters/xmpp/xmpp-chat-adapter.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

export const MAX_IMAGE_SIZE = 250 * 1024;

@Component({
    selector: 'ngx-chat-message',
    templateUrl: './chat-message.component.html',
    styleUrls: ['./chat-message.component.less']
})
export class ChatMessageComponent implements OnInit {

    @Input()
    showAvatars: boolean;

    @Input()
    avatar?: string;

    @Input()
    message: Message;

    @Input()
    nick: string;

    imageLink: string;

    constructor(
        @Inject(ChatServiceToken) public chatService: ChatService,
        private httpClient: HttpClient,
    ) {}

    ngOnInit() {
        this.tryFindImageLink();
    }

    private async tryFindImageLink() {
        if (this.chatService instanceof XmppChatAdapter) {
            for (const url of extractUrls(this.message.body)) {
                try {
                    const headRequest = await this.httpClient.head(url, {observe: 'response'}).toPromise();
                    const contentType = headRequest.headers.get('Content-Type');
                    const isImage = contentType && contentType.startsWith('image');
                    const contentLength = headRequest.headers.get('Content-Length');
                    if (isImage && parseInt(contentLength, 10) < MAX_IMAGE_SIZE) {
                        this.imageLink = url;
                        break;
                    }
                } catch (e) {
                }
            }
        }
    }
}

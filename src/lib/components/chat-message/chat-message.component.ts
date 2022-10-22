import {HttpClient} from '@angular/common/http';
import {Component, Inject, Input, OnInit, Optional} from '@angular/core';
import {Contact} from '../../core/contact';
import {Direction, Message, MessageState} from '../../core/message';
import {extractUrls} from '../../core/utils-links';
import {MessageStatePlugin, StateDate} from '../../services/adapters/xmpp/plugins/message-state.plugin';
import {XmppChatAdapter} from '../../services/adapters/xmpp/xmpp-chat-adapter.service';
import {ChatContactClickHandler, CONTACT_CLICK_HANDLER_TOKEN} from '../../hooks/chat-contact-click-handler';
import {CHAT_SERVICE_TOKEN, ChatService} from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message',
    templateUrl: './chat-message.component.html',
    styleUrls: ['./chat-message.component.less'],
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

    @Input()
    contact: Contact;

    @Input()
    showMessageReadState = true;

    showImagePlaceholder = true;

    isImage = false;

    isAudio = false;

    mediaLink: string;

    Direction = Direction;

    private readonly messageStatePlugin: MessageStatePlugin;

    constructor(
        @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
        private httpClient: HttpClient,
        @Inject(CONTACT_CLICK_HANDLER_TOKEN) @Optional() public contactClickHandler: ChatContactClickHandler,
    ) {
        this.messageStatePlugin = this.chatService.getPlugin(MessageStatePlugin);
    }

    ngOnInit() {
        this.tryFindImageLink();
    }

    private tryFindImageLink() {
        if (this.chatService instanceof XmppChatAdapter) {
            const candidateUrls = extractUrls(this.message.body);

            if (candidateUrls.length === 0) {
                this.showImagePlaceholder = false;
                return;
            }

            void this.tryFindEmbedImageUrls(candidateUrls);
        }
    }

    private async tryFindEmbedImageUrls(candidateUrls: RegExpMatchArray) {
        for (const url of candidateUrls) {
            try {
                const headRequest = await this.httpClient.head(url, {observe: 'response'}).toPromise();
                const contentType = headRequest.headers.get('Content-Type');
                this.isImage = contentType && contentType.startsWith('image');
                this.isAudio = url.includes('mp3');
                if (this.isImage || this.isAudio) {
                    this.mediaLink = url;
                    break;
                }
            } catch (e) {
            }
        }

        this.showImagePlaceholder = this.isImage;
    }

    getMessageState(): MessageState | undefined {
        if (this.showMessageReadState && this.message.state) {
            return this.message.state;
        }

        if (this.showMessageReadState && this.messageStatePlugin && this.contact) {
            const date = this.message.datetime;
            const jid = this.contact.jidBare.toString();
            const states = this.messageStatePlugin.getContactMessageState(jid);
            const messageState = this.getStateForDate(date, states);
            this.handleSendingStatus(messageState, jid);
            return messageState;
        }
        return undefined;
    }

    private handleSendingStatus = (messageState: MessageState, jid: string) => {
        if (messageState === MessageState.SENDING) {
            this.messageStatePlugin.updateContactMessageState(
                jid,
                MessageState.SENT,
            );
        }
        // run once per message
        this.handleSendingStatus = () => {
        };
    }

    private getStateForDate(date: Date, states: StateDate): MessageState | undefined {
        if (date <= states.lastRecipientSeen) {
            return MessageState.RECIPIENT_SEEN;
        } else if (date <= states.lastRecipientReceived) {
            return MessageState.RECIPIENT_RECEIVED;
        } else if (date <= states.lastSent) {
            return MessageState.SENT;
        }
        return undefined;
    }

    onContactClick() {
        if (this.contactClickHandler) {
            this.contactClickHandler.onClick(this.contact);
        }
    }

    getAvatar(): string | undefined {
        if (this.showAvatars) {
            if (this.message.direction === Direction.in) {
                return this.avatar;
            } else {
                return this.chatService.userAvatar$.getValue();
            }
        }
        return undefined;
    }
}

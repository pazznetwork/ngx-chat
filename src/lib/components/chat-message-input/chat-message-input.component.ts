import { Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Recipient } from '../../core/recipient';
import { CHAT_SERVICE_TOKEN, ChatService } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message-input',
    templateUrl: './chat-message-input.component.html',
    styleUrls: ['./chat-message-input.component.less'],
})
export class ChatMessageInputComponent implements OnInit {

    @Input()
    public recipient: Recipient;

    @Output()
    public messageSent = new EventEmitter<void>();

    public message = '';

    @ViewChild('chatInput')
    chatInput: ElementRef;

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {
    }

    ngOnInit() {
    }

    onSendMessage($event?: KeyboardEvent) {
        if ($event) {
            $event.preventDefault();
        }
        this.chatService.sendMessage(this.recipient, this.message);
        this.message = '';
        this.messageSent.emit();
    }

    focus() {
        this.chatInput.nativeElement.focus();
    }

}

import { Component, Inject, OnInit } from '@angular/core';
import { parse } from 'ltx';
import { ChatServiceToken, XmppChatAdapter } from '../ngx-chat-imports';

@Component({
    selector: 'app-send-stanza',
    templateUrl: './send-stanza.component.html',
    styleUrls: ['./send-stanza.component.css']
})
export class SendStanzaComponent implements OnInit {

    stanza: string;

    constructor(@Inject(ChatServiceToken) public chatService: XmppChatAdapter) { }

    ngOnInit() {
    }

    sendStanza() {
        const request = parse(this.stanza);
        if (request) {
            return this.chatService.chatConnectionService.send(request);
        }
    }

}

import { Component, Inject, OnInit } from '@angular/core';
import { ChatServiceToken, XmppChatAdapter } from '@pazznetwork/ngx-chat';
import { parse } from 'ltx';

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

import { Component, Inject } from '@angular/core';
import { ChatServiceToken, XmppChatAdapter } from '@pazznetwork/ngx-chat';
import { parse } from 'ltx';

@Component({
    selector: 'app-send-stanza',
    templateUrl: './send-stanza.component.html',
    styleUrls: ['./send-stanza.component.css']
})
export class SendStanzaComponent {

    stanza: string;

    constructor(@Inject(ChatServiceToken) public chatService: XmppChatAdapter) { }

    async sendStanza() {
        const request = parse(this.stanza);
        if (request) {
            await this.chatService.chatConnectionService.send(request);
        }
    }

}

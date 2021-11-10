import { Component, Inject } from '@angular/core';
import { CHAT_SERVICE_TOKEN, XmppChatAdapter } from '@pazznetwork/ngx-chat';
import { parse, stringify } from 'ltx';

@Component({
    selector: 'app-iq',
    templateUrl: './iq.component.html',
    styleUrls: ['./iq.component.css']
})
export class IqComponent {

    iqRequest: string;
    iqResponse: string;

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: XmppChatAdapter) { }

    async sendIq() {
        const request = parse(this.iqRequest);
        if (request) {
            const response = await this.chatService.chatConnectionService.sendIq(request);
            this.iqResponse = stringify(response, 4, 1);
        }
    }

}

import { Component, Inject, OnInit } from '@angular/core';
import { ChatServiceToken, XmppChatAdapter } from '@pazznetwork/ngx-chat';
import { parse, stringify } from 'ltx';

@Component({
    selector: 'app-iq',
    templateUrl: './iq.component.html',
    styleUrls: ['./iq.component.css']
})
export class IqComponent implements OnInit {

    iqRequest: string;
    iqResponse: string;

    constructor(@Inject(ChatServiceToken) public chatService: XmppChatAdapter) { }

    ngOnInit() {
    }

    async sendIq() {
        const request = parse(this.iqRequest);
        if (request) {
            const response = await this.chatService.chatConnectionService.sendIq(request);
            this.iqResponse = stringify(response, 4, 1);
        }
    }

}

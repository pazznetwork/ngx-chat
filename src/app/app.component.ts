import { Component } from '@angular/core';
import { ChatService, Contact } from 'ngx-chat-xmpp';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    title = 'app';

    constructor(private ngxChatXmppService: ChatService) {

        ngxChatXmppService.setContacts([
            new Contact("user@host", "user1"),
            new Contact("user2@host", "user2"),
        ]);

        ngxChatXmppService.logIn({
            // TODO
            domain: 'jabber.host.example',
            uri: 'wss://jabber.host.example:5280/websocket',
            password: 'password',
            jid: 'jid'
        });

    }

}

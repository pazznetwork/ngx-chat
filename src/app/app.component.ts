import { Component } from '@angular/core';
import { ChatService, Contact } from 'ngx-chat-xmpp';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    public domain: string;
    public uri: string;
    public password: string;
    public jid: string;

    constructor(private ngxChatXmppService: ChatService) {
        const contactData: any = JSON.parse(localStorage.getItem('data')) || {};
        this.domain = contactData.domain;
        this.uri = contactData.uri;
        this.password = contactData.password;
        this.jid = contactData.jid;
    }

    onLogin() {
        this.ngxChatXmppService.setContacts([
            new Contact('user@host', 'user1'),
            new Contact('user2@host', 'user2'),
        ]);

        const logInRequest = {
            domain: this.domain,
            uri: this.uri,
            password: this.password,
            jid: this.jid,
        };
        localStorage.setItem('data', JSON.stringify(logInRequest));
        this.ngxChatXmppService.logIn(logInRequest);
    }

    onLogout() {
        this.ngxChatXmppService.logOut();
    }

}

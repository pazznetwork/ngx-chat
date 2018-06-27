import { Component } from '@angular/core';
import { filter, first } from 'rxjs/operators';
import { ChatService, ContactFactoryService } from './ngx-chat-imports';

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

    constructor(private ngxChatXmppService: ChatService, private contactFactory: ContactFactoryService) {
        const contactData: any = JSON.parse(localStorage.getItem('data')) || {};
        this.domain = contactData.domain;
        this.uri = contactData.uri;
        this.password = contactData.password;
        this.jid = contactData.jid;
    }

    onLogin() {
        const logInRequest = {
            domain: this.domain,
            uri: this.uri,
            password: this.password,
            jid: this.jid,
        };
        localStorage.setItem('data', JSON.stringify(logInRequest));
        this.ngxChatXmppService.logIn(logInRequest);

        // either: set contacts explicitly
        this.ngxChatXmppService.setContacts([
            this.contactFactory.createContact('user@host', 'user1'),
            this.contactFactory.createContact('user2@host', 'user2'),
        ]);

        const metadata = this.ngxChatXmppService.contacts$.getValue()[0].metadata;
        metadata.bla = 'test';

        // or: fetch the contact list from the server
        this.ngxChatXmppService.state$.pipe(
            filter(state => state === 'online'),
            first()
        ).subscribe(() => {
            this.ngxChatXmppService.reloadContacts();
        });
    }

    onLogout() {
        this.ngxChatXmppService.logOut();
    }

}

import { Component, Inject } from '@angular/core';
import { Client } from '@xmpp/client-core';
import { jid } from '@xmpp/jid';
import {
    ChatBackgroundNotificationService,
    ChatListStateService,
    ChatService,
    ChatServiceToken,
    ContactFactoryService,
    LogLevel,
    LogService,
    MultiUserChatPlugin,
    RegistrationPlugin,
    UnreadMessageCountPlugin,
    XmppClientToken,
} from './ngx-chat-imports';

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
    public otherJid: any;
    public multiUserChatPlugin: MultiUserChatPlugin;
    public unreadMessageCountPlugin: UnreadMessageCountPlugin;
    public registrationMessage: string;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService,
                @Inject(XmppClientToken) public client: Client,
                private contactFactory: ContactFactoryService,
                private logService: LogService,
                private chatListStateService: ChatListStateService,
                chatBackgroundNotificationService: ChatBackgroundNotificationService) {
        const contactData: any = JSON.parse(localStorage.getItem('data')) || {};
        this.logService.logLevel = LogLevel.Debug;
        this.domain = contactData.domain;
        this.uri = contactData.uri;
        this.password = contactData.password;
        this.jid = contactData.jid;

        this.chatService.state$.subscribe((state) => this.stateChanged(state));
        this.multiUserChatPlugin = this.chatService.getPlugin(MultiUserChatPlugin);
        this.unreadMessageCountPlugin = this.chatService.getPlugin(UnreadMessageCountPlugin);

        chatBackgroundNotificationService.enable();

        // @ts-ignore
        window.chatService = chatService;
    }

    onLogin() {
        const logInRequest = {
            domain: this.domain,
            uri: this.uri,
            password: this.password,
            jid: this.jid,
        };
        localStorage.setItem('data', JSON.stringify(logInRequest));

        this.chatService.logIn(logInRequest);
    }

    onLogout() {
        this.chatService.logOut();
    }

    async onRegister() {
        this.registrationMessage = 'registering ...';
        try {
            await this.chatService.getPlugin(RegistrationPlugin).register(
                jid(this.jid).local,
                this.password,
                this.uri,
                this.domain
            );
            this.registrationMessage = 'registration successful';
        } catch (e) {
            this.registrationMessage = 'registration failed: ' + e.toString();
            throw e;
        }
    }

    onAddContact() {
        this.chatService.addContact(this.otherJid);
    }

    onRemoveContact() {
        this.chatService.removeContact(this.otherJid);
    }

    onOpenChat() {
        this.chatListStateService.openChat(this.chatService.getOrCreateContactById(this.otherJid));
    }

    private async stateChanged(state: 'disconnected' | 'connecting' | 'online') {
        console.log('state changed!', state);
    }

    onReconnect() {
        this.chatService.reconnect();
    }

}

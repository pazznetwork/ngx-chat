import { Component, Inject } from '@angular/core';
import {
    ChatBackgroundNotificationService,
    ChatListStateService,
    ChatService,
    ChatServiceToken,
    ContactFactoryService,
    LogInRequest,
    LogLevel,
    LogService,
    MultiUserChatPlugin,
    RegistrationPlugin,
    UnreadMessageCountPlugin,
} from '@pazznetwork/ngx-chat';

@Component({
    selector: 'app-index',
    templateUrl: './index.component.html',
    styleUrls: ['./index.component.css'],
})
export class IndexComponent {

    public domain?: string;
    public service?: string;
    public password?: string;
    public username?: string;
    public otherJid?: string;
    public readonly multiUserChatPlugin: MultiUserChatPlugin;
    public readonly unreadMessageCountPlugin: UnreadMessageCountPlugin;
    public registrationMessage?: string;

    constructor(
        @Inject(ChatServiceToken) public chatService: ChatService,
        private contactFactory: ContactFactoryService,
        private logService: LogService,
        private chatListStateService: ChatListStateService,
        chatBackgroundNotificationService: ChatBackgroundNotificationService,
    ) {
        const contactData: {
            domain?: string;
            service?: string;
            password?: string;
            username?: string;
        } = JSON.parse(localStorage.getItem('data')) || {};
        this.logService.logLevel = LogLevel.Debug;
        this.domain = contactData.domain;
        this.service = contactData.service;
        this.password = contactData.password;
        this.username = contactData.username;

        this.chatService.state$.subscribe((state) => this.stateChanged(state));
        this.multiUserChatPlugin = this.chatService.getPlugin(MultiUserChatPlugin);
        this.unreadMessageCountPlugin = this.chatService.getPlugin(UnreadMessageCountPlugin);

        chatBackgroundNotificationService.enable();

        // @ts-ignore
        window.chatService = chatService;
    }

    onLogin() {
        const logInRequest: LogInRequest = {
            domain: this.domain,
            service: this.service,
            password: this.password,
            username: this.username,
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
                this.username,
                this.password,
                this.service,
                this.domain,
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

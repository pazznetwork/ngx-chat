import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Client } from '@xmpp/client-core';
import bind from '@xmpp/plugins/bind';
import reconnect from '@xmpp/plugins/reconnect';
import plain from '@xmpp/plugins/sasl-plain';
import sessionEstablishment from '@xmpp/plugins/session-establishment';
import websocket from '@xmpp/plugins/websocket';
import { ChatMessageInputComponent } from './components/chat-message-input/chat-message-input.component';
import { ChatMessageLinkComponent } from './components/chat-message-link/chat-message-link.component';
import { ChatMessageListComponent } from './components/chat-message-list/chat-message-list.component';
import { ChatMessageTextComponent } from './components/chat-message-text/chat-message-text.component';
import { ChatMessageComponent } from './components/chat-message/chat-message.component';
import { ChatRoomMessagesComponent } from './components/chat-room-messages/chat-room-messages.component';
import { ChatWindowListComponent } from './components/chat-window-list/chat-window-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { ChatComponent } from './components/chat.component';
import { RosterContactComponent } from './components/roster-contact/roster-contact.component';
import { RosterListComponent } from './components/roster-list/roster-list.component';
import { LinksDirective } from './directives/links.directive';
import {
    BookmarkPlugin,
    MessageArchivePlugin,
    MessageUuidPlugin,
    MultiUserChatPlugin,
    PublishSubscribePlugin,
    PushPlugin,
    RegistrationPlugin,
    RosterPlugin,
    ServiceDiscoveryPlugin
} from './services/adapters/xmpp/plugins';
import { MessagePlugin } from './services/adapters/xmpp/plugins/message.plugin';
import { PingPlugin } from './services/adapters/xmpp/plugins/ping.plugin';
import { XmppChatAdapter } from './services/adapters/xmpp/xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from './services/adapters/xmpp/xmpp-chat-connection.service';
import { ChatListStateService } from './services/chat-list-state.service';
import { ChatServiceToken } from './services/chat-service';
import { ContactFactoryService } from './services/contact-factory.service';
import { LogService } from './services/log.service';


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
    ],
    declarations: [
        ChatComponent,
        ChatMessageComponent,
        ChatMessageInputComponent,
        ChatMessageLinkComponent,
        ChatMessageListComponent,
        ChatMessageTextComponent,
        ChatRoomMessagesComponent,
        ChatWindowComponent,
        ChatWindowListComponent,
        LinksDirective,
        RosterContactComponent,
        RosterListComponent,
    ],
    exports: [
        ChatComponent,
        ChatMessageInputComponent,
        ChatMessageListComponent,
        ChatRoomMessagesComponent,
    ],
    entryComponents: [
        ChatMessageLinkComponent,
        ChatMessageTextComponent,
    ],
})
export class NgxChatModule {

    static forRoot(): ModuleWithProviders {

        return {
            ngModule: NgxChatModule,
            providers: [
                ChatListStateService,
                LogService,
                ContactFactoryService,
                {
                    provide: ChatServiceToken,
                    deps: [XmppChatConnectionService, LogService, ContactFactoryService],
                    useFactory: NgxChatModule.chatAdapter
                },
                {
                    provide: XmppChatConnectionService,
                    deps: [XmppClientToken, LogService],
                    useFactory: NgxChatModule.chatConnectionService
                },
                {
                    provide: XmppClientToken,
                    useFactory: NgxChatModule.client
                },
            ],
        };

    }

    private static chatAdapter(chatConnectionService: XmppChatConnectionService,
                               logService: LogService,
                               contactFactory: ContactFactoryService) {
        const xmppChatAdapter = new XmppChatAdapter(chatConnectionService, logService, contactFactory);

        xmppChatAdapter.addPlugins([
            new BookmarkPlugin(xmppChatAdapter),
            new MessageArchivePlugin(xmppChatAdapter),
            new MessagePlugin(xmppChatAdapter, logService),
            new MessageUuidPlugin(),
            new MultiUserChatPlugin(xmppChatAdapter, logService),
            new PublishSubscribePlugin(xmppChatAdapter),
            new RosterPlugin(xmppChatAdapter, logService),
            new ServiceDiscoveryPlugin(xmppChatAdapter),
            new PushPlugin(xmppChatAdapter),
            new PingPlugin(xmppChatAdapter),
            new RegistrationPlugin(logService),
        ]);

        return xmppChatAdapter;
    }

    private static chatConnectionService(client: Client, logService: LogService) {
        const connectionService = new XmppChatConnectionService(client, logService);
        connectionService.initialize();
        return connectionService;
    }

    private static client() {
        const client = new Client();
        client.plugin(bind);
        client.plugin(reconnect);
        client.plugin(plain);
        client.plugin(sessionEstablishment);
        client.plugin(websocket);
        return client;
    }

}

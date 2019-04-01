import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, Injector, ModuleWithProviders, NgModule, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Client } from '@xmpp/client-core';
import bind from '@xmpp/plugins/bind';
import reconnect from '@xmpp/plugins/reconnect';
import plain from '@xmpp/plugins/sasl-plain';
import sessionEstablishment from '@xmpp/plugins/session-establishment';
import websocket from '@xmpp/plugins/websocket';
import { FileDropComponent } from './components/chat-filedrop/file-drop.component';
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
    HttpFileUploadPlugin,
    MessageArchivePlugin,
    MessageCarbonsPlugin,
    MessagePlugin,
    MessageStatePlugin,
    MessageUuidPlugin,
    MultiUserChatPlugin,
    PublishSubscribePlugin,
    PushPlugin,
    RegistrationPlugin,
    RosterPlugin,
    ServiceDiscoveryPlugin,
    UnreadMessageCountPlugin
} from './services/adapters/xmpp/plugins';
import { XmppChatAdapter } from './services/adapters/xmpp/xmpp-chat-adapter.service';
import { XmppChatConnectionService, XmppClientToken } from './services/adapters/xmpp/xmpp-chat-connection.service';
import { ChatListStateService } from './services/chat-list-state.service';
import { ChatMessageListRegistryService } from './services/chat-message-list-registry.service';
import { ChatServiceToken } from './services/chat-service';
import { ContactFactoryService } from './services/contact-factory.service';
import { LogService } from './services/log.service';


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HttpClientModule,
        TextFieldModule,
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
        FileDropComponent,
    ],
    exports: [
        ChatComponent,
        ChatMessageInputComponent,
        ChatMessageListComponent,
        ChatRoomMessagesComponent,
        FileDropComponent,
        LinksDirective,
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
                    useFactory: NgxChatModule.xmppChatAdapter
                },
                {
                    provide: XmppChatConnectionService,
                    deps: [XmppClientToken, LogService, NgZone],
                    useFactory: NgxChatModule.chatConnectionService
                },
                {
                    provide: XmppClientToken,
                    useFactory: NgxChatModule.client
                },
                {
                    provide: APP_INITIALIZER,
                    deps: [Injector],
                    useFactory: NgxChatModule.initializePlugins,
                    multi: true,
                }
            ],
        };

    }

    private static xmppChatAdapter(chatConnectionService: XmppChatConnectionService,
                                   logService: LogService,
                                   contactFactory: ContactFactoryService): XmppChatAdapter {
        return new XmppChatAdapter(chatConnectionService, logService, contactFactory);
    }

    private static initializePlugins(injector: Injector) {
        const initializer = function () {
            const logService = injector.get(LogService);
            const ngZone = injector.get(NgZone);
            const xmppChatAdapter = injector.get(ChatServiceToken) as XmppChatAdapter;
            const publishSubscribePlugin = new PublishSubscribePlugin(xmppChatAdapter);
            const chatMessageListRegistryService = injector.get(ChatMessageListRegistryService);
            const unreadMessageCountPlugin = new UnreadMessageCountPlugin(
                xmppChatAdapter, chatMessageListRegistryService, publishSubscribePlugin);
            const serviceDiscoveryPlugin = new ServiceDiscoveryPlugin(xmppChatAdapter);

            xmppChatAdapter.addPlugins([
                new BookmarkPlugin(xmppChatAdapter),
                new MessageArchivePlugin(xmppChatAdapter),
                new MessagePlugin(xmppChatAdapter, logService),
                new MessageUuidPlugin(),
                new MultiUserChatPlugin(xmppChatAdapter, logService),
                publishSubscribePlugin,
                new RosterPlugin(xmppChatAdapter, logService),
                serviceDiscoveryPlugin,
                new PushPlugin(xmppChatAdapter),
                // new PingPlugin(xmppChatAdapter, logService, ngZone),
                new RegistrationPlugin(logService, ngZone),
                new MessageCarbonsPlugin(xmppChatAdapter),
                unreadMessageCountPlugin,
                new HttpFileUploadPlugin(injector.get(HttpClient), serviceDiscoveryPlugin, xmppChatAdapter),
                new MessageStatePlugin(publishSubscribePlugin, xmppChatAdapter, chatMessageListRegistryService, logService),
            ]);
        };
        return initializer;
    }

    private static chatConnectionService(client: Client, logService: LogService, ngZone: NgZone) {
        const connectionService = new XmppChatConnectionService(client, logService, ngZone);
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

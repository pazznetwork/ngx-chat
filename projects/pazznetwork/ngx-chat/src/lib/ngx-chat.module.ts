import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Client } from '@xmpp/client-core';
import bind from '@xmpp/plugins/bind';
import plain from '@xmpp/plugins/sasl-plain';
import sessionEstablishment from '@xmpp/plugins/session-establishment';
import websocket from '@xmpp/plugins/websocket';

import { ChatListComponent } from './components/chat-list/chat-list.component';
import { ChatMessageInputComponent } from './components/chat-message-input/chat-message-input.component';
import { ChatMessageLinkComponent } from './components/chat-message-link/chat-message-link.component';
import { ChatMessageTextComponent } from './components/chat-message-text/chat-message-text.component';
import { ChatMessagesComponent } from './components/chat-messages/chat-messages.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { ChatComponent } from './components/chat.component';
import { RosterContactComponent } from './components/roster-contact/roster-contact.component';
import { RosterListComponent } from './components/roster-list/roster-list.component';
import { LinksDirective } from './directives/links.directive';
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
        ChatListComponent,
        ChatWindowComponent,
        ChatComponent,
        RosterListComponent,
        RosterContactComponent,
        LinksDirective,
        ChatMessagesComponent,
        ChatMessageInputComponent,
        ChatMessageLinkComponent,
        ChatMessageTextComponent,
    ],
    exports: [
        ChatComponent,
        ChatMessagesComponent,
        ChatMessageInputComponent
    ],
    entryComponents: [
        ChatMessageLinkComponent,
        ChatMessageTextComponent
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
                    useClass: XmppChatAdapter
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

    private static chatConnectionService(client: Client, logService: LogService) {
        const connectionService = new XmppChatConnectionService(client, logService);
        connectionService.initialize();
        return connectionService;
    }

    private static client() {
        const client = new Client();
        client.plugin(bind);
        client.plugin(plain);
        client.plugin(sessionEstablishment);
        client.plugin(websocket);
        return client;
    }

}

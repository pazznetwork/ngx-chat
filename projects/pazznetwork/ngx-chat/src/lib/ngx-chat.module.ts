import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatAvatarComponent } from './components/chat-avatar/chat-avatar.component';
import { FileDropComponent } from './components/chat-filedrop/file-drop.component';
import { ChatMessageInputComponent } from './components/chat-message-input/chat-message-input.component';
import { ChatMessageLinkComponent } from './components/chat-message-link/chat-message-link.component';
import { ChatMessageListComponent } from './components/chat-message-list/chat-message-list.component';
import { ChatMessageSimpleComponent } from './components/chat-message-simple/chat-message-simple.component';
import { ChatMessageTextComponent } from './components/chat-message-text/chat-message-text.component';
import { ChatMessageComponent } from './components/chat-message/chat-message.component';
import { ChatVideoWindowComponent } from './components/chat-video-window/chat-video-window.component';
import { ChatWindowFrameComponent } from './components/chat-window-frame/chat-window-frame.component';
import { ChatWindowListComponent } from './components/chat-window-list/chat-window-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { ChatComponent } from './components/chat.component';
import { RosterListComponent } from './components/roster-list/roster-list.component';
import { RosterRecipientComponent } from './components/roster-recipient/roster-recipient.component';
import { IntersectionObserverDirective } from './directives/intersection-observer.directive';
import { LinksDirective } from './directives/links.directive';
import { BlockPlugin } from './services/adapters/xmpp/plugins/block.plugin';
import { BookmarkPlugin } from './services/adapters/xmpp/plugins/bookmark.plugin';
import { EntityTimePlugin } from './services/adapters/xmpp/plugins/entity-time.plugin';
import { HttpFileUploadPlugin } from './services/adapters/xmpp/plugins/http-file-upload.plugin';
import { MessageArchivePlugin } from './services/adapters/xmpp/plugins/message-archive.plugin';
import { MessageCarbonsPlugin } from './services/adapters/xmpp/plugins/message-carbons.plugin';
import { MessageStatePlugin } from './services/adapters/xmpp/plugins/message-state.plugin';
import { MessageUuidPlugin } from './services/adapters/xmpp/plugins/message-uuid.plugin';
import { MessagePlugin } from './services/adapters/xmpp/plugins/message.plugin';
import { MucSubPlugin } from './services/adapters/xmpp/plugins/muc-sub.plugin';
import { MultiUserChatPlugin } from './services/adapters/xmpp/plugins/multi-user-chat.plugin';
import { PingPlugin } from './services/adapters/xmpp/plugins/ping.plugin';
import { PublishSubscribePlugin } from './services/adapters/xmpp/plugins/publish-subscribe.plugin';
import { PushPlugin } from './services/adapters/xmpp/plugins/push.plugin';
import { RegistrationPlugin } from './services/adapters/xmpp/plugins/registration.plugin';
import { RosterPlugin } from './services/adapters/xmpp/plugins/roster.plugin';
import { ServiceDiscoveryPlugin } from './services/adapters/xmpp/plugins/service-discovery.plugin';
import { UnreadMessageCountPlugin } from './services/adapters/xmpp/plugins/unread-message-count.plugin';
import { XmppChatAdapter } from './services/adapters/xmpp/xmpp-chat-adapter.service';
import { XmppChatConnectionService } from './services/adapters/xmpp/xmpp-chat-connection.service';
import { XmppClientFactoryService } from './services/adapters/xmpp/xmpp-client-factory.service';
import { ChatBackgroundNotificationService } from './services/chat-background-notification.service';
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
        ChatMessageSimpleComponent,
        ChatMessageTextComponent,
        ChatWindowComponent,
        ChatWindowListComponent,
        LinksDirective,
        IntersectionObserverDirective,
        RosterListComponent,
        FileDropComponent,
        ChatWindowFrameComponent,
        ChatVideoWindowComponent,
        ChatAvatarComponent,
        RosterRecipientComponent,
    ],
    exports: [
        ChatComponent,
        ChatMessageInputComponent,
        ChatMessageListComponent,
        ChatMessageSimpleComponent,
        FileDropComponent,
        LinksDirective,
    ],
})
export class NgxChatModule {

    static forRoot(): ModuleWithProviders<NgxChatModule> {

        return {
            ngModule: NgxChatModule,
            providers: [
                ChatBackgroundNotificationService,
                ChatListStateService,
                ChatMessageListRegistryService,
                ContactFactoryService,
                LogService,
                XmppChatConnectionService,
                XmppClientFactoryService,
                {
                    provide: ChatServiceToken,
                    deps: [
                        XmppChatConnectionService,
                        ChatMessageListRegistryService,
                        ContactFactoryService,
                        HttpClient,
                        LogService,
                        NgZone,
                    ],
                    useFactory: NgxChatModule.xmppChatAdapter,
                },
            ],
        };

    }

    private static xmppChatAdapter(
        chatConnectionService: XmppChatConnectionService,
        chatMessageListRegistryService: ChatMessageListRegistryService,
        contactFactory: ContactFactoryService,
        httpClient: HttpClient,
        logService: LogService,
        ngZone: NgZone,
    ): XmppChatAdapter {
        const xmppChatAdapter = new XmppChatAdapter(chatConnectionService, logService, contactFactory);

        const serviceDiscoveryPlugin = new ServiceDiscoveryPlugin(xmppChatAdapter);
        const publishSubscribePlugin = new PublishSubscribePlugin(xmppChatAdapter, serviceDiscoveryPlugin);
        const entityTimePlugin = new EntityTimePlugin(xmppChatAdapter, serviceDiscoveryPlugin, logService);
        const multiUserChatPlugin = new MultiUserChatPlugin(xmppChatAdapter, logService, serviceDiscoveryPlugin);
        const unreadMessageCountPlugin = new UnreadMessageCountPlugin(
            xmppChatAdapter, chatMessageListRegistryService, publishSubscribePlugin, entityTimePlugin, multiUserChatPlugin);

        xmppChatAdapter.addPlugins([
            new BookmarkPlugin(publishSubscribePlugin),
            new MessageArchivePlugin(xmppChatAdapter, serviceDiscoveryPlugin, multiUserChatPlugin, logService),
            new MessagePlugin(xmppChatAdapter, logService),
            new MessageUuidPlugin(),
            multiUserChatPlugin,
            publishSubscribePlugin,
            new RosterPlugin(xmppChatAdapter, logService),
            serviceDiscoveryPlugin,
            new PushPlugin(xmppChatAdapter, serviceDiscoveryPlugin),
            new PingPlugin(xmppChatAdapter, logService, ngZone),
            new RegistrationPlugin(logService, ngZone),
            new MessageCarbonsPlugin(xmppChatAdapter),
            unreadMessageCountPlugin,
            new HttpFileUploadPlugin(httpClient, serviceDiscoveryPlugin, xmppChatAdapter, logService),
            new MessageStatePlugin(publishSubscribePlugin, xmppChatAdapter, chatMessageListRegistryService, logService,
                entityTimePlugin),
            new MucSubPlugin(xmppChatAdapter, serviceDiscoveryPlugin),
            new BlockPlugin(xmppChatAdapter, serviceDiscoveryPlugin),
            entityTimePlugin,
        ]);

        return xmppChatAdapter;
    }

}

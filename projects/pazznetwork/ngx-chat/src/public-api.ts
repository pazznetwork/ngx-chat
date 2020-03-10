/*
 * Public API Surface of ngx-chat
 */

export { selectFile } from './lib/core/utils-file';
export * from './lib/ngx-chat.module';
export * from './lib/components/chat.component';
export * from './lib/components/chat-message-list/chat-message-list.component';
export * from './lib/components/chat-message-input/chat-message-input.component';
export * from './lib/components/chat-window/chat-window.component';
export * from './lib/core';
export * from './lib/services/adapters/xmpp/xmpp-chat-adapter.service';
export * from './lib/services/adapters/xmpp/plugins';
export { XmppClientToken } from './lib/services/adapters/xmpp/xmpp-chat-connection.service';
export * from './lib/services/chat-background-notification.service';
export * from './lib/services/chat-service';
export * from './lib/services/chat-list-state.service';
export * from './lib/services/contact-factory.service';
export * from './lib/services/log.service';
export { LinkOpener, LinkOpenerToken } from './lib/components/chat-message-link/chat-message-link.component';

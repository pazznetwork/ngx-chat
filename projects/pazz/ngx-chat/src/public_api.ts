/*
 * Public API Surface of ngx-chat
 */

export * from './lib/ngx-chat.module';
export * from './lib/components/chat.component';
export * from './lib/components/chat-messages/chat-messages.component';
export * from './lib/components/chat-message-input/chat-message-input.component';
export * from './lib/core';
export * from './lib/services/adapters/xmpp/plugins';
export { XmppClientToken } from './lib/services/adapters/xmpp/xmpp-chat-connection.service';
export * from './lib/services/chat-service';
export * from './lib/services/chat-list-state.service';
export * from './lib/services/contact-factory.service';

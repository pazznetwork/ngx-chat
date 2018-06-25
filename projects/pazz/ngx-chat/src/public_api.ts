/*
 * Public API Surface of ngx-chat
 */

export * from './lib/ngx-chat.module';
export * from './lib/components/chat.component';
export * from './lib/core';
export * from './lib/services/adapters/xmpp/plugins';
export * from './lib/services/chat-list-state.service';
export { XmppClientToken } from './lib/services/adapters/xmpp/xmpp-chat-connection.service';
export * from './lib/services/contact-factory.service';

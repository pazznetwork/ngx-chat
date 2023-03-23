// SPDX-License-Identifier: MIT
import type { ChatPlugin } from './chat-plugin';
import type { XmppConnectionService } from '../service';

export interface StanzaHandlerChatPlugin extends ChatPlugin {
  /**
   * Register the plugin handlers on the current chat connection.
   */
  registerHandler(connection: XmppConnectionService): Promise<void>;

  /**
   * Unregister the plugin handlers on the current chat connection.
   * To avoid bad stanza handling on connection change
   */
  unregisterHandler(connection: XmppConnectionService): Promise<void>;
}

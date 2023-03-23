// SPDX-License-Identifier: MIT
import type { SASLMechanism } from './sasl-mechanism';

export interface ConnectionOptions {
  /**
   * mechanisms - Common option for Websocket and Bosh:
   *  The *mechanisms* option allows you to specify the SASL mechanisms that this
   *  instance of Strophe.Connection (and therefore your XMPP client) will
   *  support.
   *
   *  The value must be an array of objects with Strophe.SASLMechanism
   *  prototypes.
   *
   *  If nothing is specified, then the following mechanisms (and their
   *  priorities) are registered:
   *
   *      SCRAM-SHA-1 - 60
   *      PLAIN       - 50
   *      OAUTHBEARER - 40
   *      X-OAUTH2    - 30
   *      ANONYMOUS   - 20
   *      EXTERNAL    - 10
   */
  mechanisms?: SASLMechanism[];
  /**
   * explicitResourceBinding - Common option for Websocket and Bosh:
   *  If `explicitResourceBinding` is set to a truthy value, then the XMPP client
   *  needs to explicitly call `Strophe.Connection.prototype.bind` once the XMPP
   *  server has advertised the "urn:ietf:params:xml:ns:xmpp-bind" feature.
   *
   *  Making this step explicit allows client authors to first finish other
   *  stream related tasks, such as setting up an XEP-0198 Stream Management
   *  session, before binding the JID resource for this session.
   */
  explicitResourceBinding?: boolean;
}

// SPDX-License-Identifier: MIT
export interface BoshOptions {
  /**
   * sync - BOSH option:
   *  By adding "sync" to the options, you can control if requests will
   *  be made synchronously or not. The default behaviour is asynchronous.
   *  If you want to make requests synchronous, make "sync" evaluate to true.
   *  > let conn = new Strophe.Connection("/http-bind/", {sync: true});
   *
   *  You can also toggle this on an already established connection.
   *  > conn.options.sync = true;
   */
  sync?: boolean;
  /**
   * customHeaders - BOSH option:
   *  The *customHeaders* option can be used to provide custom HTTP headers to be
   *  included in the XMLHttpRequests made.
   */
  customHeaders?: Record<string, string>;
  /**
   * keepalive - BOSH option:
   *  The *keepalive* option can be used to instruct Strophe to maintain the
   *  current BOSH session across interruptions such as webpage reloads.
   *
   *  It will do this by caching the sessions tokens in sessionStorage, and when
   *  "restore" is called it will check whether there are cached tokens with
   *  which it can resume an existing session.
   */
  keepalive?: boolean;
  /**
   * withCredentials - BOSH option:
   *  The *withCredentials* option should receive a Boolean value and is used to
   *  indicate whether cookies should be included in ajax requests (by default
   *  they're not).
   *  Set this value to true if you are connecting to a BOSH service
   *  and for some reason need to send cookies to it.
   *  In order for this to work cross-domain, the server must also enable
   *  credentials by setting the Access-Control-Allow-Credentials response header
   *  to "true". For most use-cases however this setting should be false (which
   *  is the default).
   *  Additionally, when using Access-Control-Allow-Credentials, the
   *  Access-Control-Allow-Origin header can't be set to the wildcard "*", but
   *  instead must be restricted to actual domains.
   */
  withCredentials?: boolean;
  /**
   * contentType - BOSH option:
   *  The *contentType* option can be set to change the default Content-Type
   *  of "text/xml; charset=utf-8", which can be useful to reduce the amount of
   *  CORS preflight requests that are sent to the server.
   */
  contentType?: string;
}

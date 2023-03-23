// SPDX-License-Identifier: MIT
/**
 *   Connection status constants for use by the connection handler
 *  callback.
 *
 *  Status.ERROR - An error has occurred
 *  Status.CONNECTING - The connection is currently being made
 *  Status.CONNFAIL - The connection attempt failed
 *  Status.AUTHENTICATING - The connection is authenticating
 *  Status.AUTHFAIL - The authentication attempt failed
 *  Status.CONNECTED - The connection has succeeded
 *  Status.DISCONNECTED - The connection has been terminated
 *  Status.DISCONNECTING - The connection is currently being terminated
 *  Status.ATTACHED - The connection has been attached
 *  Status.REDIRECT - The connection has been redirected
 *  Status.CONNTIMEOUT - The connection has timed out
 */
export enum Status {
  ERROR = 0,
  CONNECTING = 1,
  CONNFAIL = 2,
  AUTHENTICATING = 3,
  AUTHFAIL = 5,
  CONNECTED = 6,
  DISCONNECTED = 7,
  DISCONNECTING = 8,
  ATTACHED = 8,
  REDIRECT = 9,
  CONNTIMEOUT = 10,
  BINDREQUIRED = 11,
  ATTACHFAIL = 12,
  RECONNECTING = 13,
  REGIFAIL = 14,
  REGISTER = 15,
  REGISTERED = 16,
  CONFLICT = 17,
  NOTACCEPTABLE = 18,
}

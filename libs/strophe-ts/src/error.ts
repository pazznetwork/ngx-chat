// SPDX-License-Identifier: MIT
/** Constants: Error Condition Constants
 * Error conditions that occur commonly.
 *
 * ErrorCondition.BAD_FORMAT - Stanza has unspecified format
 * ErrorCondition.CONFLICT - Protocol conflict
 * ErrorCondition.MISSING_JID_NODE - No jid and anonymous users are now allowed on server
 * ErrorCondition.NO_AUTH_MECH - No authentication mechanism configured
 * ErrorCondition.UNKNOWN_REASON - Unknown error cause
 */
import type { Handler } from './handler';
import { fatal } from './log';

export enum ErrorCondition {
  HOST_UNKNOWN = 'host-unknown',
  REMOTE_CONNECTION_FAILED = 'remote-connection-failed',
  BAD_FORMAT = 'bad-format',
  CONFLICT = 'conflict',
  MISSING_JID_NODE = 'x-strophe-bad-non-anon-jid',
  NO_AUTH_MECH = 'no-auth-mech',
  UNKNOWN_REASON = 'unknown',
}

interface StropheErrorFields {
  sourceURL?: string;
  fileName?: string;
  line?: string;
  lineNumber?: string;
}

export type StropheError = Error & StropheErrorFields;

/**
 * function that properly logs an error to the console
 */
export function handleError(e: StropheError, handler?: Handler): void {
  if (typeof e.stack !== 'undefined') {
    fatal(e.stack);
  }
  if (e.sourceURL) {
    fatal(
      'error: ' + handler + ' ' + e.sourceURL + ':' + e.line + ' - ' + e.name + ': ' + e.message
    );
  } else if (e.fileName) {
    fatal(
      'error: ' +
        handler +
        ' ' +
        e.fileName +
        ':' +
        e.lineNumber +
        ' - ' +
        e.name +
        ': ' +
        e.message
    );
  } else {
    fatal('error: ' + e.message);
  }
}

export function isStropheError(e: unknown): e is StropheError {
  return (e as StropheError).fileName !== undefined;
}

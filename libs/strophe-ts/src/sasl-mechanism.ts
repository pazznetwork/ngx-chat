// SPDX-License-Identifier: MIT
import type { Sasl } from './sasl';

/**
 *  encapsulates SASL authentication mechanisms.
 *
 *  User code may override the priority for each mechanism or disable it completely.
 *  See <priority> for information about changing priority and <test> for information on
 *  how to disable a mechanism.
 *
 *  By default, all mechanisms are enabled and the priorities are
 *
 *  SCRAM-SHA1 - 40
 *  DIGEST-MD5 - 30
 *  Plain - 20
 */
export interface SASLMechanism {
  readonly mechname: string;

  /**
   *  Determines which <SASLMechanism> is chosen for authentication (Higher is better).
   *  Users may override this to prioritize mechanisms differently.
   *
   *  In the default configuration the priorities are
   *
   *  SCRAM-SHA1 - 40
   *  DIGEST-MD5 - 30
   *  Plain - 20
   *
   *  Example: (This will cause Strophe to choose the mechanism that the server sent first)
   *
   *  > Strophe.SASLMD5.priority = Strophe.SASLSHA1.priority;
   *
   *  See <SASL mechanisms> for a list of available mechanisms.
   *
   */
  readonly priority: number;

  readonly isClientFirst: boolean;

  /**
   *  Checks if mechanism able to run.
   *  To disable a mechanism, make this return false;
   *
   *  To disable plain authentication run
   *  > Strophe.SASLPlain.test = function() {
   *  >   return false;
   *  > }
   *
   *  See <SASL mechanisms> for a list of available mechanisms.
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   *
   *  Returns:
   *
   *  @returns (Boolean) If mechanism was able to run.
   */
  test(sasl: Sasl): boolean;

  /**
   *  Called by protocol implementation on incoming challenge.
   *
   *  By default, if the client is expected to send data first (isClientFirst === true),
   *  this method is called with `challenge` as null on the first call,
   *  unless `clientChallenge` is overridden in the relevant subclass.
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   *    (String) challenge - current challenge to handle.
   *
   *  Returns:
   *    (String) Mechanism response.
   */
  onChallenge(sasl: Sasl, challenge?: string): Promise<string | null | undefined>;

  /**
   *  Called before starting mechanism on some connection.
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   */
  onStart(sasl: Sasl): void;

  /**
   *  Protocol informs mechanism implementation about SASL failure.
   */
  onFailure(): void;

  /**
   *  Protocol informs mechanism implementation about SASL success.
   */
  onSuccess(): void;

  /** PrivateFunction: clientChallenge
   *  Called by the protocol implementation if the client is expected to send
   *  data first in the authentication exchange (i.e. isClientFirst === true).
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   *
   *  Returns:
   *    (String) Mechanism response.
   */
  clientChallenge(sasl: Sasl, challenge?: string): Promise<string | undefined | null>;
}

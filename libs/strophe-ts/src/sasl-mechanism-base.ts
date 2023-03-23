// SPDX-License-Identifier: MIT
import type { Sasl } from './sasl';
import type { SASLMechanism } from './sasl-mechanism';

export abstract class SASLMechanismBase implements SASLMechanism {
  protected sasl: Sasl | null | undefined;

  protected constructor(
    readonly mechname: string,
    readonly isClientFirst: boolean,
    readonly priority: number
  ) {}

  abstract onChallenge(
    sasl: Sasl,
    domain: string,
    challenge?: string
  ): Promise<string | undefined | null>;

  abstract test(sasl: Sasl): boolean;

  onStart(sasl: Sasl): void {
    this.sasl = sasl;
  }

  /**
   *  Protocol informs mechanism implementation about SASL failure.
   */
  onFailure(): void {
    this.sasl = null;
  }

  /**
   *  Protocol informs mechanism implementation about SASL success.
   */
  onSuccess(): void {
    this.sasl = null;
  }

  /**
   *  Called by the protocol implementation if the client is expected to send
   *  data first in the authentication exchange (i.e. isClientFirst === true).
   *
   *  Parameters:
   *    (Strophe.Connection) connection - Target Connection.
   *
   *  Returns:
   *    (String) Mechanism response.
   */
  clientChallenge(sasl: Sasl, challenge?: string): Promise<string | undefined | null> {
    if (!this.isClientFirst) {
      throw new Error('clientChallenge should not be called if isClientFirst is false!');
    }
    return this.onChallenge(sasl, challenge ?? '');
  }
}

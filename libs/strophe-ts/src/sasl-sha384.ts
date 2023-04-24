// SPDX-License-Identifier: MIT
import type { Sasl } from './sasl';
import { clientChallenge, scramResponse } from './scram';
import { SASLMechanismBase } from './sasl-mechanism-base';

export class SASLSHA384 extends SASLMechanismBase {
  /** PrivateConstructor: SASLSHA384
   *  SASL SCRAM SHA 384 authentication.
   */
  constructor() {
    super('SCRAM-SHA-384', true, 71);
  }

  test(sasl: Sasl): boolean {
    return sasl.authcid !== null;
  }

  async onChallenge(sasl: Sasl, challenge?: string): Promise<string> {
    return (
      await scramResponse(sasl, () => sasl.onSaslFailed(), challenge, 'SHA-384', 384)
    ).toString();
  }

  override async clientChallenge(sasl: Sasl, testCnonce: string): Promise<string> {
    return Promise.resolve(clientChallenge(sasl, testCnonce));
  }
}

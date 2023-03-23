// SPDX-License-Identifier: MIT
import { clientChallenge, scramResponse } from './scram';
import { SASLMechanismBase } from './sasl-mechanism-base';
import type { Sasl } from './sasl';

export class SASLSHA1 extends SASLMechanismBase {
  /**
   *  SASL SCRAM SHA 1 authentication.
   */
  constructor() {
    super('SCRAM-SHA-1', true, 60);
  }

  test(sasl: Sasl): boolean {
    return sasl.authcid !== null;
  }

  async onChallenge(sasl: Sasl, challenge?: string): Promise<string> {
    const result = await scramResponse(sasl, challenge, 'SHA-1', 160);
    return result.toString();
  }

  override async clientChallenge(sasl: Sasl, testCnonce: string): Promise<string> {
    return Promise.resolve(clientChallenge(sasl, testCnonce));
  }
}

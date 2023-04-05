// SPDX-License-Identifier: AGPL-3.0-or-later
import { NS, parseToXml, stanzaMatch } from '@pazznetwork/strophets';

describe('handler', () => {
  it('async handler and regular handler should match roster handler', async () => {
    const rosterStanza =
      parseToXml(`<iq xmlns="jabber:client" to="hero@local-jabber.entenhausen.pazz.de/1500107743940204262345346"
            from="hero@local-jabber.entenhausen.pazz.de" type="set" id="push4030773323021824156">
            <block xmlns="urn:xmpp:blocking">
                <item jid="villain@local-jabber.entenhausen.pazz.de"></item>
            </block>
        </iq>`);

    expect(
      stanzaMatch(rosterStanza, {
        ns: NS.CLIENT,
        name: 'iq',
        type: 'set',
      })
    ).toBeTruthy();
  });
});

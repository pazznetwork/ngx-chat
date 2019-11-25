import { LogInRequest } from '@pazznetwork/ngx-chat/lib/core';
import { browser } from 'protractor';

it('should define configuration', () => {
    if (!browser.params || !browser.params.xmppJid) {
        fail('no e2e configuration given, populate the environment variables mentioned in protractor.conf.js with valid xmpp credentials');
    }
});

export const suiteConfig: LogInRequest = {
    service: browser.params.xmppUri,
    domain: browser.params.xmppDomain,
    username: browser.params.xmppJid,
    password: browser.params.xmppPassword,
};

# Strophe.ts

Strophe.ts is a JavaScript library for speaking XMPP via BOSH ([XEP 124](https://xmpp.org/extensions/xep-0124.html)
and [XEP 206](https://xmpp.org/extensions/xep-0206.html)) and
WebSockets ([RFC 7395](http://tools.ietf.org/html/rfc7395)).

Its primary purpose is to enable web-based, real-time XMPP applications that run in any browser.

## Browser support

last 2 Chrome version
last 2 Firefox version
last 2 Edge major versions
last 2 Safari major versions
last 2 iOS major versions
Firefox ESR
not IE 11

## License

It is licensed under the [MIT license](https://github.com/pazznetwork/strophets/raw/master/LICENSE.txt)

## Author & History

Strophe.js was originally created by Jack Moffitt. It was originally developed for Chesspark, an online chess community
based on XMPP technology. It has been cared for and improved over the years as a main package strophe.js for
converse.js.
Strophe.ts is an effort of moving this package into the typescript landscape with a browser first mentality to simplify
building new XMPP chat clients on top of it.

## Documentation

### General usage

1. Create a connection instance.
2. Login with a registered User.
3. Send a message to another registered user.

```ts
import { Connection } from './connection';
import { $msg } from './builder-helper';

const domain = 'xmpp.service.top-level-domain';
const myJid = 'local-user@' + domain;
const conn = await Connection.create('wss://service.top-level-domain', domain);
await conn.login(myJid, 'very-secret-password-now!');
const msg = $msg({
  from: myJid,
  to: 'friend@' + domain,
  xmlns: 'jabber:client',
})
  .c('body')
  .t('Hello my Friend!')
  .tree();
conn.send($msg({}));
```

### IN-Band Registration

Server Administrators can allow in-band registration through anonymous connections. This is in simple setups discouraged
to avoid spam but otherwise great for testing or also great as a feature with proper Verification and permission
management.

```ts
import { Connection } from './connection';
import { $msg } from './builder-helper';

const domain = 'xmpp.service.top-level-domain';
const myJid = 'local-user@' + domain;
const service = 'wss://service.top-level-domain';
const conn = await Connection.create(service, domain);
conn.register(myJid, 'very-secret-password-now!', service, domain);
```

### Logging Stanzas for better Debugging

After creating a connection you can set the function fields `Connection.xmlInput` and `Connection.xmlOutput`
for logging, the default functions do nothing.

Due to limitations of current Browsers' XML-Parsers the opening and closing
`<stream>` tag for WebSocket-Connections will be passed as self-closing in these calls.

BOSH-Connections will have all stanzas wrapped in a <body> tag. You can extend your implementation to strip the tag if
you want.

```ts
import { Connection } from './connection';
import { $msg } from './builder-helper';

const domain = 'xmpp.service.top-level-domain';
const myJid = 'local-user@' + domain;
const conn = await Connection.create('wss://service.top-level-domain', domain);

await conn.login(myJid, 'very-secret-password-now!');
```


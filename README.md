# [Get Started](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/#get-started) | [Get Help](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/#get-help) | [Get Involved](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/#get-involved)

[![Build status](https://api.travis-ci.com/pazznetwork/ngx-chat.svg?branch=master)](https://travis-ci.com/pazznetwork/ngx-chat) [![Coverage](https://coveralls.io/repos/github/pazznetwork/ngx-chat/badge.svg?branch=master)](https://coveralls.io/github/pazznetwork/ngx-chat) ![maintained - yes](https://img.shields.io/badge/maintained-yes-blue) [![contributions - welcome](https://img.shields.io/badge/contributions-welcome-blue)](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/) [![Made with TypeScript](https://img.shields.io/badge/4-blue?logo=typescript&logoColor=white)](https://typescriptlang.org) [![Made with Node.js](https://img.shields.io/badge/>=10-blue?logo=node.js&logoColor=white)](https://nodejs.org) [![Made with Node.js](https://img.shields.io/badge/14-blue?logo=angular&logoColor=white)](https://angular.io/)

[![view - Documentation](https://img.shields.io/badge/view-Documentation-blue?style=for-the-badge)](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/)

This library provides an out-of-the-box usable XMPP chat component. It is customizable and offers an API to integrate it with your
application.

![screenshot](https://user-images.githubusercontent.com/4292951/49931801-f5c3d880-fec7-11e8-8a74-6600ea2cf9b0.png)

[Have a look at our demo (valid XMPP credentials required)](https://pazznetwork.github.io/ngx-chat-ghpages/)

- 🌋 build in XMPP server support
  - send and receive messages, load messages from message history (XEP-0313), supports multi-user chat
- 🔥 fully featured angular chat components
- 💉 open for injection
  - use the server side buddy list or use your own data source for that, API methods for adding / removing buddies available
  - replace the chat service with an own interface implementations to change the chat server

## Table of Contents

- Get Started
  - Compatibility
  - Installation and usage
- Get Help
  - Documentation
  - FAQ
- Get Involved
  - Development
  - Build the plugin
  - Run the plugin tests
  - Releasing
  - Contributing
- Licensing

## Get Started

### Compatibility

- Angular 14 (ngx-chat 0.14.x)
- Angular 13 (ngx-chat 0.13.x)
- Angular 12 (ngx-chat 0.12.x)
- Angular 11 (ngx-chat 0.11.x)
- Angular 10 (ngx-chat 0.10.x)
- Angular 9 (ngx-chat 0.9.x)
- Angular 8 (ngx-chat 0.4.x)
- Angular 6 (ngx-chat 0.3.x)
- requires node >= 10.13 && npm >= 5 for build

### Installation and usage

These instructions require Angular 14.

First install ngx-chat and its dependencies via npm:

```bash
npm install --save @pazznetwork/strophe-ts @pazznetwork/ngx-chat-shared @pazznetwork/xmpp-adapter @pazznetwork/ngx-xmpp @pazznetwork/ngx-chat rxjs@7.5.7
```

or via yarn:

```bash
yarn add @pazznetwork/strophe-ts @pazznetwork/ngx-chat-shared @pazznetwork/xmpp-adapter @pazznetwork/ngx-xmpp @pazznetwork/ngx-chat
```

After that, import ngx-chat in the layer from which you want to use it:

```ts
@NgModule({
    ...
    imports: [
        ...
        NgxChatModule,
    ],
    ...
})
```

Add the `ngx-chat`-component at the end of your root component template:

```html
<ngx-chat></ngx-chat>
```

Or create a wrapping component like this:

```ts
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'custom-chat',
    template: `
        <ngx-chat
            id="ngx-chat"
            [translations]="{
                acceptSubscriptionRequest: 'chat.acceptSubscriptionRequest' | translate,
                block: 'chat.block' | translate,
                blockAndReport: 'chat.blockAndReport' | translate,
                contactRequestIn: 'chat.contactRequestIn' | translate,
                contactRequestOut: 'chat.contactRequestOut' | translate,
                contacts: 'chat.contacts' | translate,
                contactsUnaffiliated: 'chat.contactsUnaffiliated' | translate,
                dateFormat: 'general.dateFormat' | translate,
                denySubscriptionRequest: 'chat.denySubscriptionRequest' | translate,
                dismiss: 'chat.dismiss' | translate,
                dropMessage: 'chat.dropMessage' | translate,
                locale: translateService.currentLang,
                noContacts: 'chat.noContacts' | translate,
                noMessages: 'chat.noMessages' | translate,
                placeholder: 'chat.placeholder' | translate,
                presence: {
                    present: 'chat.presence.present' | translate,
                    unavailable: 'chat.presence.unavailable' | translate,
                    away: 'chat.presence.away' | translate
                },
                rooms: 'chat.rooms' | translate,
                subscriptionRequestMessage: 'chat.subscriptionRequestMessage' | translate,
                timeFormat: 'general.timeFormat' | translate
            }"
            [rosterState]="isThisMobile ? 'shown' : 'hidden'
            "
            class="responsive-medium-or-greater-block"
        >
        </ngx-chat>
    `,
})
export class CustomChatComponent {
    readonly isThisMobile = window?.innerWidth < 768;
    constructor(public readonly translateService: TranslateService) {}
}

```

You are now ready to go. You will not see anything until you log in. Log in via `ngx-chat` wherever you want (e.g. in a component or a
service)
by injecting `ChatService` and calling `login`:

```ts
constructor(@Inject(CHAT_SERVICE_TOKEN) chatService: ChatService) {
    chatService.logIn({
        domain: 'ngx-chat.example',
        username: 'someuser',
        password: 'password'
    });
}
```

_Optional_: body padding when roster list is expanded

Add css styling like the following to your main styles.css if you want to resize your main content when the roster is expanded.

```css
body {
  transition-property: padding-right;
  transition-duration: 0.4s;
  padding-right: 0;
}

body.has-roster {
  padding-right: 14em;
}
```

## Get Help

### Documentation

Below you will find some instructions to getting
started. [Have a look at the wiki for more FAQ's and abstract documentation.](https://github.com/pazznetwork/ngx-chat/wiki)

For an api, architecture and code overview checkout our [**
compodoc** documentation](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/).

### FAQ

**Q: Which browsers are supported?**  
A: It is tested in Chrome, Safari and Firefox.

**Q: Does ngx-chat work with self-signed certificates?**  
A: Yes, if the following criteria are met:

- the certificate has to be trusted by the browser you are using. Chrome uses the operating system trust store for certificates while
  Firefox has a custom implementation.
- the common name (CN) matches the uri of the service you are connecting to

**Q: Can ngx-chat be used without the UI?**  
A: Yes. Use the  @pazznetwork/ngx-xmpp angular package directly and leave out the import and installation of @pazznetwork/ngx-chat.
If you don't need an angular package, you can also use @pazznetwork/xmpp-adapter directly.

**Q: My question is not answered**  
A: [No problem, feel free to raise an issue](https://github.com/pazznetwork/ngx-chat/issues/new).

## Get Involved

### Development

**Pull requests are welcome!**

The source code for ngx-chat can be found in the `libs/ngx-chat-ui` folder. The demo application is in the `apps/demo` folder.

Create a ```.secrets-const.ts``` in the `libs/ngx-xmpp/src` directory providing the following constants:

```ts
export const devXmppDomain = '<YourDomain>';
export const devXmppJid = '<YourAdminJid>';
export const devXmppPassword = '<YourAdminXmppPassword>';
```

Copy the key and .pem file you use for your local ejabberd server to the following paths:

```bash
apps/demo/src/local.entenhausen.pazz.de-key.pem
apps/demo/src/local.entenhausen.pazz.de.pem
```

```bash
# clone this repository
git clone git@github.com:pazznetwork/ngx-chat.git
cd ngx-chat

# install dependencies
npm install

# build the library
npm run build:all

# Build the sample app continuously and run the demo application on
# http://localhost:4200
npm start
```

### Testing

Install first the browsers for playwright:
  
```bash
npm run install:browsers
```

To test the XMPP implementation run the karma tests in the `libs/ngx-xmpp` folder from the root folder:

```bash
ng test ngx-xmpp
```

To test the ngx-chat angular components run the demo e2e project from the root folder:

```bash
ng e2e demo-e2e
```

### Committing

For clean and standardised commit messages we use commit lint, for the format see: <https://www.conventionalcommits.org/en/v1.0.0/>.

### Releasing

```bash
npm run publish:all
```

### Contributing

If you want to contribute to this project, please read the [contribution guidelines](CONTRIBUTING.md).

## Licensing

If you wish to use this software for commercial purposes or require a different license, please contact Pazz GmbH at <info@pazz.com> to obtain a commercial license or discuss alternative licensing options.

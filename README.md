# [Get Started](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/#get-started) | [Get Help](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/#get-help) | [Get Involved](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/#get-involved)

[![Build status](https://api.travis-ci.com/pazznetwork/ngx-chat.svg?branch=master)](https://travis-ci.com/pazznetwork/ngx-chat) [![Coverage](https://coveralls.io/repos/github/pazznetwork/ngx-chat/badge.svg?branch=master)](https://coveralls.io/github/pazznetwork/ngx-chat) ![maintained - yes](https://img.shields.io/badge/maintained-yes-blue) [![contributions - welcome](https://img.shields.io/badge/contributions-welcome-blue)](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/) [![Made with TypeScript](https://img.shields.io/badge/4-blue?logo=typescript&logoColor=white)](https://typescriptlang.org) [![Made with Node.js](https://img.shields.io/badge/>=10-blue?logo=node.js&logoColor=white)](https://nodejs.org) [![Made with Node.js](https://img.shields.io/badge/12-blue?logo=angular&logoColor=white)](https://angular.io/)

[![view - Documentation](https://img.shields.io/badge/view-Documentation-blue?style=for-the-badge)](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/)

This library provides an out-of-the-box usable XMPP chat component. It is customizable and offers an API to integrate it with your
application.
This library provides an out-of-the-box usable XMPP chat component. It is customizable and offers an API to integrate it with your application.

## Features
* connect to XMPP servers via websocket
* send and receive messages
* load messages from message history (XEP-0313)
* use the server side buddy list or use your own data source for that, API methods for adding / removing buddies available 
* supports multi-user chat

![screenshot](https://user-images.githubusercontent.com/4292951/49931801-f5c3d880-fec7-11e8-8a74-6600ea2cf9b0.png)

[Have a look at our demo (valid XMPP credentials required)](https://pazznetwork.github.io/ngx-chat-ghpages/)

* 🌋 build in XMPP server support
    * send and receive messages, load messages from message history (XEP-0313), supports multi user chat
* 🔥 fully featured angular chat components
* 💉 open for injection
    * use the server side buddy list or use your own data source for that, API methods for adding / removing buddies available
    * replace the chat service with an own interface implementations to change the chat server

## Table of Contents

* Get Started
    * Compatibility
    * Installation and usage
* Get Help
    * Documentation
    * FAQ
* Get Involved
    * Development
    * Build the plugin
    * Run the plugin tests
    * Releasing

## Get Started

### Compatibility

* Angular 14 (ngx-chat 0.14.x)
* Angular 13 (ngx-chat 0.13.x)
* Angular 12 (ngx-chat 0.12.x)
* Angular 11 (ngx-chat 0.11.x)
* Angular 10 (ngx-chat 0.10.x)
* Angular 9 (ngx-chat 0.9.x)
* Angular 8 (ngx-chat 0.4.x)
* Angular 6 (ngx-chat 0.3.x)
* requires node >= 16.16 && npm >= 8.11 for build

### Installation and usage

These instructions require Angular 12.

First install ngx-chat and its dependencies via npm:

```bash
npm install --save @pazznetwork/ngx-chat @xmpp/client@~0.9.2 @angular/cdk@~14.0.5
```

After that, import ngx-chat in your root module:

```
@NgModule({
    ...
    imports: [
        ...
        NgxChatModule.forRoot(),
        BrowserAnimationsModule, // alternatively NoopAnimationsModule 
    ],
    ...
})
```

Add the `ngx-chat`-component at the end of your root component template:

```html

<ngx-chat></ngx-chat>
``` 

You are now ready to go. You will not see anything until you log in. Log in via `ngx-chat` wherever you want (e.g. in a component or a
service)
by injecting `ChatService` and calling `login`:

```
constructor(@Inject(CHAT_SERVICE_TOKEN) chatService: ChatService) {
    chatService.logIn({
        domain: 'ngx-chat.example',
        service: 'wss://ngx-chat.example:5280/websocket',
        password: 'password',
        username: 'someuser',
    });
}
```

Add the following to polyfills.ts:
```
/***************************************************************************************************
 * APPLICATION IMPORTS
 */
(window as any).global = window;
```

*Optional*: body padding when roster list is expanded

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

For a api, architecture and code overview checkout our [**
compo**doc documentation](https://pazznetwork.github.io/ngx-chat-ghpages/documentation/).

### FAQ

**Q: Which browsers are supported?**  
A: It is tested in Chrome, Safari and Firefox.

**Q: Does ngx-chat work with self-signed certificates?**  
A: Yes, if the following criteria are met:

* the certificate has to be trusted by the browser you are using. Chrome uses the operating system trust store for certificates while
  Firefox has a custom implementation.
* the common name (CN) matches the uri of the service you are connecting to

**Q: Can ngx-chat be used without the UI?**  
A: Yes. Inject the chat service via `@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService`, login via `logIn` and start sending
messages via the `sendMessage` method.

**Q: My question is not answered**  
A: [No problem, feel free to raise an issue](https://github.com/pazznetwork/ngx-chat/issues/new).


## Get Involved

### Development

**WARNING**
Pay attention to your imports in the testing app:
`'@pazznetwork/ngx-chat'` instead
of `'../../../projects/pazznetwork/ngx-chat/src/lib/services/adapters/xmpp/plugins/multi-user-chat.plugin'`

**Pull requests are welcome!**

The source code for ngx-chat can be found in the `projects/pazznetwork/ngx-chat` folder. The demo application is in the `src` folder in the
project root.

```bash
# clone this repository
git clone git@github.com:pazznetwork/ngx-chat.git
cd ngx-chat

# install dependencies
npm install

# build the library continuously
ng build @pazznetwork/ngx-chat --watch

# (in another terminal) build the sample app continuously
# will run the demo application on
# http://localhost:4200
ng serve
```

### Build the plugin

`npm run build-lib`

### Test the integration of your project with the plugin

`$fileOutDirPath` is your `npm run build` out-dir path

`npm install $fileOutDirPath`

### Run the plugin tests

`npm run test:once`

### Committing

For clean and standardised commit messages we use commit lint, for the format see: https://www.conventionalcommits.org/en/v1.0.0/.

### Releasing

`npm run build-lib` is necessary because otherwise creates a package with ngcc and throws on publish the following error:  
`trying to publish a package that has been compiled by ngcc`

```bash
# increment version number in projects/pazznetwork/ngx-chat/package.json
VERSION=0.14.8 # change accordingly
npm run changelog
git add .
git commit -m "docs: release $VERSION"
git tag v$VERSION
git push origin master --tags
./push-release.sh
```

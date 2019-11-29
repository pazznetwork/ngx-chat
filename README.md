# @pazznetwork/ngx-chat [![Build status](https://api.travis-ci.com/pazznetwork/ngx-chat.svg?branch=master)](https://travis-ci.com/pazznetwork/ngx-chat) [![Coverage](https://coveralls.io/repos/github/pazznetwork/ngx-chat/badge.svg?branch=master)](https://coveralls.io/github/pazznetwork/ngx-chat)

This library provides an out-of-the-box usable XMPP chat component. It is customizable and offers an API to integrate it with your application.

## Features
* connect to XMPP servers via websocket
* send and receive messages
* load messages from message history (XEP-0313)
* use the server side buddy list or use your own data source for that, API methods for adding / removing buddies available 
* supports multi user chat

## Compatibility
* Angular 8 (ngx-chat 0.4.x)
* Angular 6 (ngx-chat 0.3.x)
* requires node >= 8 && npm >= 5 for build

## Demo
[Have a look at our demo (valid XMPP credentials required)](https://pazznetwork.github.io/ngx-chat-ghpages/) 
![screenshot](https://user-images.githubusercontent.com/4292951/49931801-f5c3d880-fec7-11e8-8a74-6600ea2cf9b0.png)

## Documentation
Below you will find some instructions to getting started. [Have a look at the wiki for FAQ's and the API documentation.](https://github.com/pazznetwork/ngx-chat/wiki)

## Installation and usage

This instructions require Angular 8.
[If you are using Angular 6, follow this instructions instead](https://github.com/pazznetwork/ngx-chat/wiki/Angular-6-compatibility)

First of all, install ngx-chat via npm:
```bash
npm install --save @pazznetwork/ngx-chat @xmpp/client@~0.3.0 @angular/cdk@~8.0.0
```

After that, import ngx-chat in your root module:
```typescript
@NgModule({
    ...
    imports: [
        ...,
        NgxChatModule.forRoot(),
        BrowserAnimationsModule,; // alternatively NoopAnimationsModule 
    ],
    ...
})
```

Add the `ngx-chat`-component at the end of your root component template:
```html
<ngx-chat></ngx-chat>
``` 

You are now ready to go. You will not see anything until you log in.
Log in via `ngx-chat` wherever you want (e.g. in a component or a service)
 by injecting `ChatService` and calling `login`:
```typescript
constructor(@Inject(ChatServiceToken); ChatService;) {
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

Add css styling like the following to your main styles.css if 
you want to resize your main content when the roster is expanded.
```css
body {
    transition-property: padding-right;
    transition-duration: 0.4s;
    padding-right: 0px;
}

body.has-roster {
    padding-right: 14em;
}
```

## FAQ

**Q: Which browsers are supported?**
A: It is tested in Chrome, Safari and Firefox.

**Q: Does ngx-chat work with self signed certificates?**
A: Yes, if the following criteria are met:
* the certificate has to be trusted by the browser you are using. Chrome uses the operating system trust store for certificates while Firefox has a custom implementation.
* the common name (CN) matches the uri of the service you are connecting to 

**Q: Can ngx-chat be used without the UI?**
A: Yes. Inject the chat service via `@Inject(ChatServiceToken) public chatService: ChatService`, login via `logIn` and start sending messages via the `sendMessage` method.

**Q: My question is not answered**
A: [No problem, feel free to raise an issue](https://github.com/pazznetwork/ngx-chat/issues/new).

## Development

**Pull requests are welcome!**

The source code for ngx-chat can be found in the `projects/pazznetwork/ngx-chat` folder.
The demo application is in the `src` folder in the project root.  
**Important:**  Swap the import in src/app/ngx-chat-imports.ts to have live-reload while developing on ngx-chat.

```bash
# clone this repository
git clone git@github.com:pazznetwork/ngx-chat.git
cd ngx-chat

# install dependencies
npm install

# will run the demo application on
# http://localhost:4200
ng serve
```


### Build the plugin

`npm run build-lib`

### Run the plugin tests

`npm run test:once`


## Releasing
```bash
# increment version number in package.json
VERSION=0.4.3 # change accordingly
npm run changelog
git add .
git commit -m "docs: release $VERSION"
git tag v$VERSION
git push origin master --tags
./push-release.sh
```

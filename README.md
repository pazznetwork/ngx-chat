# @pazznetwork/ngx-chat [![Build status](https://api.travis-ci.com/pazznetwork/ngx-chat.svg?branch=master)](https://travis-ci.com/pazznetwork/ngx-chat) [![Coverage](https://coveralls.io/repos/github/pazznetwork/ngx-chat/badge.svg?branch=master)](https://coveralls.io/github/pazznetwork/ngx-chat)

This library provides an out-of-the-box usable XMPP chat component. It is customizable and offers an API to integrate it with your application.

## Features
* connect to XMPP servers via BOSH or websocket
* send and receive messages
* load messages from message history (XEP-0313)
* manage and use the server side buddy list or use your own data source for that 

## Demo
[Have a look at our demo (valid XMPP credentials required)](https://pazznetwork.github.io/ngx-chat-ghpages/) 

## Documentation
Below you will find some instructions to getting started. [Have a look at the wiki for FAQ's and the API documentation.](https://github.com/pazznetwork/ngx-chat/wiki)

## Installation and usage
First of all, install ngx-chat via npm:
```bash
npm install --save @pazznetwork/ngx-chat @xmpp/client
```

After that, import it in your root module:
```typescript
@NgModule({
    ...
    imports: [
        ...,
        NgxChatModule.forRoot()
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
constructor(@Inject(ChatServiceToken) chatService: ChatService) {
    chatService.logIn({
        domain: 'ngx-chat.example',
        service: 'wss://ngx-chat.example:5280/websocket',
        username: 'someuser',
        password: 'password',
    });
}
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

## Development

If you want to develop on ngx-chat, clone this repository.
The Library can be found in the `projects/pazznetwork/ngx-chat` folder.
In the `src` folder you find the demo application.

### Build the plugin

`npm run build-lib`

### Run the plugin tests

`npm run test:once`

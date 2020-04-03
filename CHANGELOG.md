<a name="0.9.1"></a>
## [0.9.1](https://github.com/pazznetwork/ngx-chat/compare/v0.9.0...v0.9.1) (2020-04-03)


### Bug Fixes

* add most components, directives and services to public api ([5acf33d](https://github.com/pazznetwork/ngx-chat/commit/5acf33d)), closes [#29](https://github.com/pazznetwork/ngx-chat/issues/29)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/pazznetwork/ngx-chat/compare/v0.4.7...v0.9.0) (2020-03-12)


### Bug Fixes

* check for local-only username did not correctly detect "@" ([d4289c9](https://github.com/pazznetwork/ngx-chat/commit/d4289c9)), closes [#27](https://github.com/pazznetwork/ngx-chat/issues/27)
* disable file upload if not supported by xmpp server ([66a4cd5](https://github.com/pazznetwork/ngx-chat/commit/66a4cd5)), closes [#16](https://github.com/pazznetwork/ngx-chat/issues/16)
* gracefully determine support for message archive management ([0214f77](https://github.com/pazznetwork/ngx-chat/commit/0214f77)), closes [#16](https://github.com/pazznetwork/ngx-chat/issues/16) [#27](https://github.com/pazznetwork/ngx-chat/issues/27)
* handle non-unique jid in discoverServices ([8bcac07](https://github.com/pazznetwork/ngx-chat/commit/8bcac07)), closes [#25](https://github.com/pazznetwork/ngx-chat/issues/25)
* sample app should not throw if user has no contacts ([eea771e](https://github.com/pazznetwork/ngx-chat/commit/eea771e)), closes [#16](https://github.com/pazznetwork/ngx-chat/issues/16)



<a name="0.4.7"></a>
## [0.4.7](https://github.com/pazznetwork/ngx-chat/compare/v0.4.6...v0.4.7) (2019-12-12)


### Bug Fixes

* focus message input when clicking somewhere in chat window ([1959515](https://github.com/pazznetwork/ngx-chat/commit/1959515))



<a name="0.4.6"></a>
## [0.4.6](https://github.com/pazznetwork/ngx-chat/compare/v0.4.5...v0.4.6) (2019-12-11)


### Bug Fixes

* contact subscription action styling in chat window ([9f585b4](https://github.com/pazznetwork/ngx-chat/commit/9f585b4))



<a name="0.4.5"></a>
## [0.4.5](https://github.com/pazznetwork/ngx-chat/compare/v0.4.4...v0.4.5) (2019-12-11)



<a name="0.4.4"></a>
## [0.4.4](https://github.com/pazznetwork/ngx-chat/compare/v0.4.3...v0.4.4) (2019-11-29)


### Bug Fixes

* logOut should not raise an exception if user is not logged in ([23baee9](https://github.com/pazznetwork/ngx-chat/commit/23baee9))



<a name="0.4.3"></a>
## [0.4.3](https://github.com/pazznetwork/ngx-chat/compare/v0.4.2...v0.4.3) (2019-11-29)


### Bug Fixes

* drag error in safari ([ad00a2d](https://github.com/pazznetwork/ngx-chat/commit/ad00a2d))
* drop file here stretched over all windows instead of the current ([cf7905a](https://github.com/pazznetwork/ngx-chat/commit/cf7905a))
* no more infinite reconnect problems in firefox / safari ([98b0a3a](https://github.com/pazznetwork/ngx-chat/commit/98b0a3a))
* safari line break ([e7b3c85](https://github.com/pazznetwork/ngx-chat/commit/e7b3c85))


### BREAKING CHANGES

* logIn():
 - uri renamed to service
 - jid renamed to username



<a name="0.4.2"></a>
## [0.4.2](https://github.com/pazznetwork/ngx-chat/compare/v0.4.1...v0.4.2) (2019-08-07)


### Bug Fixes

* only display recipient state if message is outgoing ([d432272](https://github.com/pazznetwork/ngx-chat/commit/d432272))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/pazznetwork/ngx-chat/compare/v0.4.0...v0.4.1) (2019-07-19)


### Bug Fixes

* update has-roster body class when rosterState set from application ([d2b12e2](https://github.com/pazznetwork/ngx-chat/commit/d2b12e2))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/pazznetwork/ngx-chat/compare/v0.3.3...v0.4.0) (2019-06-19)


### Bug Fixes

* room bookmarks now serialize correctly and allow more than one room ([b83ce24](https://github.com/pazznetwork/ngx-chat/commit/b83ce24))



<a name="0.3.3"></a>
## [0.3.3](https://github.com/pazznetwork/ngx-chat/compare/v0.3.2...v0.3.3) (2019-06-07)


### Features

* add queryAllRooms api to multi user chat plugin ([ab83ded](https://github.com/pazznetwork/ngx-chat/commit/ab83ded))



<a name="0.3.2"></a>
## [0.3.2](https://github.com/pazznetwork/ngx-chat/compare/v0.3.1...v0.3.2) (2019-05-31)


### Bug Fixes

* muc compatibility when mod_vcard module in ejabberd is enabled ([6873ba6](https://github.com/pazznetwork/ngx-chat/commit/6873ba6))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/pazznetwork/ngx-chat/compare/v0.3.0...v0.3.1) (2019-05-29)


### Bug Fixes

* only ask for notifications if browser supports them ([cfbec9a](https://github.com/pazznetwork/ngx-chat/commit/cfbec9a))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/pazznetwork/ngx-chat/compare/v0.2.24...v0.3.0) (2019-05-21)


### Bug Fixes

* multi user chat ([290a0cb](https://github.com/pazznetwork/ngx-chat/commit/290a0cb))
* remove getPlugin-calls in plugins, dependencies are now explicit ([fd8215b](https://github.com/pazznetwork/ngx-chat/commit/fd8215b)), closes [#4](https://github.com/pazznetwork/ngx-chat/issues/4)


### Features

* MucSub / Browser notifications ([a44973f](https://github.com/pazznetwork/ngx-chat/commit/a44973f))



<a name="0.2.24"></a>
## [0.2.24](https://github.com/pazznetwork/ngx-chat/compare/v0.2.23...v0.2.24) (2019-04-08)


### Bug Fixes

* alignment of chat close button ([c9770cb](https://github.com/pazznetwork/ngx-chat/commit/c9770cb))


### Features

* add chat actions API ([cb4b235](https://github.com/pazznetwork/ngx-chat/commit/cb4b235))
* add selectFile util function, e.g. for file upload ([e39bb79](https://github.com/pazznetwork/ngx-chat/commit/e39bb79))



<a name="0.2.23"></a>
## [0.2.23](https://github.com/pazznetwork/ngx-chat/compare/v0.2.22...v0.2.23) (2019-04-02)


### Bug Fixes

* remove devDependency on [@angular](https://github.com/angular)/cdk (it is a peer dependency) ([db2bdaf](https://github.com/pazznetwork/ngx-chat/commit/db2bdaf))



<a name="0.2.22"></a>
## [0.2.22](https://github.com/pazznetwork/ngx-chat/compare/v0.2.21...v0.2.22) (2019-04-01)


### Features

* multiline text input ([26bf992](https://github.com/pazznetwork/ngx-chat/commit/26bf992))



<a name="0.2.21"></a>
## [0.2.21](https://github.com/pazznetwork/ngx-chat/compare/v0.2.20...v0.2.21) (2019-03-26)


### Bug Fixes

* further overflow behavior adjustments ([7b25dbb](https://github.com/pazznetwork/ngx-chat/commit/7b25dbb))



<a name="0.2.20"></a>
## [0.2.20](https://github.com/pazznetwork/ngx-chat/compare/v0.2.19...v0.2.20) (2019-03-25)


### Bug Fixes

* emit message sent event ([a7b27f7](https://github.com/pazznetwork/ngx-chat/commit/a7b27f7))



<a name="0.2.19"></a>
## [0.2.19](https://github.com/pazznetwork/ngx-chat/compare/v0.2.18...v0.2.19) (2019-03-25)


### Features

* roster list can now be shown & hidden via @Input ([a08943f](https://github.com/pazznetwork/ngx-chat/commit/a08943f))



<a name="0.2.18"></a>
## [0.2.18](https://github.com/pazznetwork/ngx-chat/compare/v0.2.17...v0.2.18) (2019-03-25)


### Bug Fixes

* replace word-break with hyphens ([b7dca18](https://github.com/pazznetwork/ngx-chat/commit/b7dca18))
* unknown contact group is now only displayed if messages exist ([60ce906](https://github.com/pazznetwork/ngx-chat/commit/60ce906))
* wider contact list, fix contact list (and message) overflowing ([a414d8f](https://github.com/pazznetwork/ngx-chat/commit/a414d8f))
* word breaking in firefox ([b9af244](https://github.com/pazznetwork/ngx-chat/commit/b9af244))


### Features

* add roster list header ([00a96c2](https://github.com/pazznetwork/ngx-chat/commit/00a96c2))



<a name="0.2.17"></a>
## [0.2.17](https://github.com/pazznetwork/ngx-chat/compare/v0.2.16...v0.2.17) (2019-03-12)


### Bug Fixes

* add default value for message state handling ([b52309a](https://github.com/pazznetwork/ngx-chat/commit/b52309a))



<a name="0.2.16"></a>
## [0.2.16](https://github.com/pazznetwork/ngx-chat/compare/v0.2.15...v0.2.16) (2019-03-04)


### Features

* add LinkOpener ([f22ce6d](https://github.com/pazznetwork/ngx-chat/commit/f22ce6d))



<a name="0.2.15"></a>
## [0.2.15](https://github.com/pazznetwork/ngx-chat/compare/v0.2.14...v0.2.15) (2019-02-25)


### Bug Fixes

* improve handling of unset message state dates ([6e81c29](https://github.com/pazznetwork/ngx-chat/commit/6e81c29))



<a name="0.2.14"></a>
## [0.2.14](https://github.com/pazznetwork/ngx-chat/compare/v0.2.13...v0.2.14) (2019-02-25)


### Features

* message states (sent, received, read) ([7384950](https://github.com/pazznetwork/ngx-chat/commit/7384950))



<a name="0.2.13"></a>
## [0.2.13](https://github.com/pazznetwork/ngx-chat/compare/v0.2.12...v0.2.13) (2019-02-18)


### Bug Fixes

* add HttpFileUploadService to public api ([9b380d3](https://github.com/pazznetwork/ngx-chat/commit/9b380d3))



<a name="0.2.12"></a>
## [0.2.12](https://github.com/pazznetwork/ngx-chat/compare/v0.2.11...v0.2.12) (2019-02-18)


### Features

* add support for http file upload ([99c7fd1](https://github.com/pazznetwork/ngx-chat/commit/99c7fd1))
* reconnect with last known credentials ([599705a](https://github.com/pazznetwork/ngx-chat/commit/599705a))



<a name="0.2.11"></a>
## [0.2.11](https://github.com/pazznetwork/ngx-chat/compare/v0.2.10...v0.2.11) (2019-02-05)


### Features

* allow parameterization of contact list states ([1b9a059](https://github.com/pazznetwork/ngx-chat/commit/1b9a059))



<a name="0.2.10"></a>
## [0.2.10](https://github.com/pazznetwork/ngx-chat/compare/v0.2.9...v0.2.10) (2019-02-04)


### Bug Fixes

* skip handling of message stanzas with type 'error' ([b4418d3](https://github.com/pazznetwork/ngx-chat/commit/b4418d3))



<a name="0.2.9"></a>
## [0.2.9](https://github.com/pazznetwork/ngx-chat/compare/v0.2.8...v0.2.9) (2019-01-17)


### Bug Fixes

* reduce logging level, fix message ui ([98c7caa](https://github.com/pazznetwork/ngx-chat/commit/98c7caa))



<a name="0.2.8"></a>
## [0.2.8](https://github.com/pazznetwork/ngx-chat/compare/v0.2.7...v0.2.8) (2019-01-16)


### Bug Fixes

* show most recent message in chat-message-list when contact changes ([53112ab](https://github.com/pazznetwork/ngx-chat/commit/53112ab))


### Features

* group messages by date, minor UI improvements for messages ([925e8d2](https://github.com/pazznetwork/ngx-chat/commit/925e8d2))



<a name="0.2.7"></a>
## [0.2.7](https://github.com/pazznetwork/ngx-chat/compare/v0.2.6...v0.2.7) (2019-01-11)


### Bug Fixes

* do not emit messages$ when sending a message ([cb906a5](https://github.com/pazznetwork/ngx-chat/commit/cb906a5))
* do not open minimized chat window when sending message ([fdee840](https://github.com/pazznetwork/ngx-chat/commit/fdee840))
* unread messages only counts incoming messages, not sent ones ([fe89ab8](https://github.com/pazznetwork/ngx-chat/commit/fe89ab8))


### Features

* add support for message carbons (XEP-0280) ([9762de5](https://github.com/pazznetwork/ngx-chat/commit/9762de5))
* synchronize 'last read date' via pubsub ([65a8a67](https://github.com/pazznetwork/ngx-chat/commit/65a8a67))



<a name="0.2.6"></a>
## [0.2.6](https://github.com/pazznetwork/ngx-chat/compare/v0.2.5...v0.2.6) (2019-01-04)


### Bug Fixes

* chat window header spacing ([f23174b](https://github.com/pazznetwork/ngx-chat/commit/f23174b))
* remove wrong border on chat window input ([63090d1](https://github.com/pazznetwork/ngx-chat/commit/63090d1))
* try to fix reconnect issues when using iOS, disable ping plugin ([2dace50](https://github.com/pazznetwork/ngx-chat/commit/2dace50))
* unaffiliated contacts not showing when receiving the first message ([9ecca74](https://github.com/pazznetwork/ngx-chat/commit/9ecca74))



<a name="0.2.5"></a>
## [0.2.5](https://github.com/pazznetwork/ngx-chat/compare/v0.2.4...v0.2.5) (2019-01-03)


### Bug Fixes

* increase ping interval from 5 seconds to 60 seconds ([fbec21b](https://github.com/pazznetwork/ngx-chat/commit/fbec21b))
* use message id attribute first ([c0bb556](https://github.com/pazznetwork/ngx-chat/commit/c0bb556))


### Features

* add unread message count to contact in roster list ([6b9a4e2](https://github.com/pazznetwork/ngx-chat/commit/6b9a4e2))
* unread message count plugin ([9195e63](https://github.com/pazznetwork/ngx-chat/commit/9195e63))



<a name="0.2.4"></a>
## [0.2.4](https://github.com/pazznetwork/ngx-chat/compare/v0.2.3...v0.2.4) (2018-12-19)


### Features

* add presence status ([6e86e1f](https://github.com/pazznetwork/ngx-chat/commit/6e86e1f))



<a name="0.2.3"></a>
## [0.2.3](https://github.com/pazznetwork/ngx-chat/compare/v0.2.2...v0.2.3) (2018-12-19)


### Bug Fixes

* try to diagnose reconnect issues in cordova on ios devices ([fb8eec0](https://github.com/pazznetwork/ngx-chat/commit/fb8eec0))


### Code Refactoring

* pendingIn / pendingOut converted to BehaviorSubject ([cc9ea2a](https://github.com/pazznetwork/ngx-chat/commit/cc9ea2a))


### Features

* roster contains incoming requests, sent requests and others ([0a75f40](https://github.com/pazznetwork/ngx-chat/commit/0a75f40))


### BREAKING CHANGES

* the pendingIn / pendingOut properties of Contact have
been converted to BehaviorSubject and changed to the rxjs naming
convention.



<a name="0.2.2"></a>
## [0.2.2](https://github.com/pazznetwork/ngx-chat/compare/v0.2.1...v0.2.2) (2018-11-16)


### Bug Fixes

* use NgZone to allow e2e test execution ([103f2c6](https://github.com/pazznetwork/ngx-chat/commit/103f2c6))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/pazznetwork/ngx-chat/compare/v0.2.0...v0.2.1) (2018-11-14)


### Bug Fixes

* prevent connection loop on kick ([bd8af74](https://github.com/pazznetwork/ngx-chat/commit/bd8af74))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/pazznetwork/ngx-chat/compare/v0.1.9...v0.2.0) (2018-11-08)


### Bug Fixes

* add no implicit any checks ([9486d60](https://github.com/pazznetwork/ngx-chat/commit/9486d60))



<a name="0.1.9"></a>
## [0.1.9](https://github.com/pazznetwork/ngx-chat/compare/v0.1.8...v0.1.9) (2018-11-08)


### Features

* add ping (xep-0199) support ([5274c84](https://github.com/pazznetwork/ngx-chat/commit/5274c84))
* add support for in-band-registration (xep-0077) ([1205d2f](https://github.com/pazznetwork/ngx-chat/commit/1205d2f))



<a name="0.1.8"></a>
## [0.1.8](https://github.com/pazznetwork/ngx-chat/compare/a08dc5a...v0.1.8) (2018-11-06)


### Bug Fixes

* links parsing for multiple occurrences of the same link ([a08dc5a](https://github.com/pazznetwork/ngx-chat/commit/a08dc5a))


### Code Refactoring

* update to xmpp.js 0.5.2 ([264ca31](https://github.com/pazznetwork/ngx-chat/commit/264ca31))


### BREAKING CHANGES

* * changed LogInRequest interface
* make chatConnectionService.client private
* removed XmppClientToken




## [0.2.6](https://github.com/pazznetwork/ngx-chat/compare/v0.2.5...v0.2.6) (2019-01-04)


### Bug Fixes

* chat window header spacing ([f23174b](https://github.com/pazznetwork/ngx-chat/commit/f23174b))
* remove wrong border on chat window input ([63090d1](https://github.com/pazznetwork/ngx-chat/commit/63090d1))
* try to fix reconnect issues when using iOS, disable ping plugin ([2dace50](https://github.com/pazznetwork/ngx-chat/commit/2dace50))
* unaffiliated contacts not showing when receiving the first message ([9ecca74](https://github.com/pazznetwork/ngx-chat/commit/9ecca74))



## [0.2.5](https://github.com/pazznetwork/ngx-chat/compare/v0.2.4...v0.2.5) (2019-01-03)


### Bug Fixes

* increase ping interval from 5 seconds to 60 seconds ([fbec21b](https://github.com/pazznetwork/ngx-chat/commit/fbec21b))
* use message id attribute first ([c0bb556](https://github.com/pazznetwork/ngx-chat/commit/c0bb556))


### Features

* add unread message count to contact in roster list ([6b9a4e2](https://github.com/pazznetwork/ngx-chat/commit/6b9a4e2))
* unread message count plugin ([9195e63](https://github.com/pazznetwork/ngx-chat/commit/9195e63))



## [0.2.4](https://github.com/pazznetwork/ngx-chat/compare/v0.2.3...v0.2.4) (2018-12-19)


### Features

* add presence status ([6e86e1f](https://github.com/pazznetwork/ngx-chat/commit/6e86e1f))



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



## [0.2.2](https://github.com/pazznetwork/ngx-chat/compare/v0.2.1...v0.2.2) (2018-11-16)


### Bug Fixes

* use NgZone to allow e2e test execution ([103f2c6](https://github.com/pazznetwork/ngx-chat/commit/103f2c6))



## [0.2.1](https://github.com/pazznetwork/ngx-chat/compare/v0.2.0...v0.2.1) (2018-11-14)


### Bug Fixes

* prevent connection loop on kick ([bd8af74](https://github.com/pazznetwork/ngx-chat/commit/bd8af74))



# [0.2.0](https://github.com/pazznetwork/ngx-chat/compare/v0.1.9...v0.2.0) (2018-11-08)


### Bug Fixes

* add no implicit any checks ([9486d60](https://github.com/pazznetwork/ngx-chat/commit/9486d60))



## [0.1.9](https://github.com/pazznetwork/ngx-chat/compare/v0.1.8...v0.1.9) (2018-11-08)


### Features

* add ping (xep-0199) support ([5274c84](https://github.com/pazznetwork/ngx-chat/commit/5274c84))
* add support for in-band-registration (xep-0077) ([1205d2f](https://github.com/pazznetwork/ngx-chat/commit/1205d2f))



## [0.1.8](https://github.com/pazznetwork/ngx-chat/compare/a08dc5a...v0.1.8) (2018-11-06)


### Bug Fixes

* links parsing for multiple occurrences of the same link ([a08dc5a](https://github.com/pazznetwork/ngx-chat/commit/a08dc5a))




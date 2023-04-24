// SPDX-License-Identifier: AGPL-3.0-or-later
// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/dist/zone';
import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

interface ContextModuleApi {
  (request: unknown): void;
  // is a function and returns the module id of the parsed request.
  resolve: () => string;
  // is a function that returns an array of all possible requests that the context module can handle.
  keys: () => unknown[];
  // id is the module id of the context module. This may be useful for module.hot.accept.
  id: string;
}

// https://webpack.js.org/guides/dependency-management/#requirecontext
declare const require: {
  // The arguments passed to require.context must be literals!
  // A context module exports a (require) function that takes one argument: the request.
  context(dir: string, subDirs?: boolean, regExp?: RegExp, mode?: 'sync'): ContextModuleApi;
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment([BrowserDynamicTestingModule], platformBrowserDynamicTesting());

// Then we find all the tests.
const context = require.context('./', true, /.*\.spec\.ts$/);

// And load the modules.
context.keys().map(context);

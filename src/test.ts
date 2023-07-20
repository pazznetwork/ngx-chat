// This file is required by karma.conf.js and loads recursively all the .spec and framework files
/**
 * IMPORTANT
 * Keep the imports zone.js first in order, otherwise the karma runner breaks.
 * Required order is: 'zone.js', 'zone.js/testing' ...
 */
 // tslint:disable:ordered-imports
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: false }
}
);

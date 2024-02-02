// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const { join } = require('path');
const { constants } = require('karma');
process.env['CHROME_BIN'] = require('puppeteer').executablePath();
const browser = process.env['DEBUG'] ? 'DebugChrome' : 'Chrome';

module.exports = () => {
  return {
    basePath: '.',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    specReporter: {
      maxLogLines: 5, // limit number of lines logged per test
      suppressErrorSummary: true, // do not print error summary
      suppressFailed: false, // do not print information about failed tests
      suppressPassed: false, // do not print information about passed tests
      suppressSkipped: true, // do not print information about skipped tests
      showSpecTiming: false, // print the time elapsed for each spec
    },
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('karma-spec-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
        random: false,
        stopSpecOnExpectationFailure: true,
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: join(__dirname, './coverage'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    customLaunchers: {
      DebugChrome: {
        base: 'Chrome',
        flags: [
          '--disable-translate',
          '--disable-extensions',
          '--no-first-run',
          '--disable-background-networking',
          '--remote-debugging-port=9223',
          '--remote-debugging-address=0.0.0.0',
        ],
      },
    },
    reporters: ['spec', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: constants.LOG_INFO,
    autoWatch: true,
    browsers: [browser],
    singleRun: false,
    restartOnFileChange: true,
  };
};

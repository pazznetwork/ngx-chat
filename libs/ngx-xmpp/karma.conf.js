// Karma configuration file, see link for more information
// https://karma-runner.github.io/6.4/config/configuration-file.html

const { join } = require('path');
const getBaseKarmaConfig = require('../../karma.conf');

module.exports = function (config) {
  const baseConfig = getBaseKarmaConfig();
  config.set({
    ...baseConfig,
    coverageReporter: {
      ...baseConfig.coverageReporter,
      dir: join(__dirname, '../../coverage/libs/ngx-xmpp'),
    },
    browsers: ['ChromeHeadlessInsecure'],
    customLaunchers: {
      ChromeInsecure: {
        base: 'Chrome',
        flags: ['--ignore-certificate-errors', '--allow-insecure-localhost'],
      },
      ChromeHeadlessInsecure: {
        base: 'ChromeHeadless',
        flags: ['--headless=new', '--disable-gpu', '--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'],
      },
    },
    client: {
      jasmine: {
        timeoutInterval: 300000,
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    browserNoActivityTimeout: 600000,
  });
};

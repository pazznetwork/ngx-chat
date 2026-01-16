const nxPreset = require('@nx/jest/preset').default;

module.exports = {
    moduleFileExtensions: ['ts', 'js', 'html', 'mjs'],
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    transform: {
        '^.+\\.(ts|js|mjs|html)$': 'jest-preset-angular',
    },
};

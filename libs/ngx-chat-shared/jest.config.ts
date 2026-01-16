export default {
    displayName: 'ngx-chat-shared',
    preset: '../../jest.preset.js',
    transform: {
        '^.+\\.(ts|js|mjs|html)$': ['jest-preset-angular', {
            tsconfig: '<rootDir>/tsconfig.spec.json',
            stringifyContentPathRegex: '\\.(html|svg)$',
            useESM: true,
        }],
    },
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    snapshotSerializers: [
        'jest-preset-angular/build/serializers/no-ng-attributes',
        'jest-preset-angular/build/serializers/ng-snapshot',
        'jest-preset-angular/build/serializers/html-comment',
    ],
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../../coverage/libs/ngx-chat-shared',
};

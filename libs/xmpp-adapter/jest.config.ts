/* eslint-disable */
export default {
    displayName: 'xmpp-adapter',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
    transform: {
        '^.+\\.(ts|mjs|js|html)$': [
            'jest-preset-angular',
            {
                tsconfig: '<rootDir>/tsconfig.spec.json',
                stringifyContentPathRegex: '\\.(html|svg)$',
            },
        ],
    },
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    snapshotSerializers: [
        'jest-preset-angular/build/serializers/no-ng-attributes',
        'jest-preset-angular/build/serializers/ng-snapshot',
        'jest-preset-angular/build/serializers/html-comment',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    moduleNameMapper: {
        '^@pazznetwork/ngx-chat-shared$': '<rootDir>/../../libs/ngx-chat-shared/src/index.ts',
        '^@pazznetwork/xmpp-adapter$': '<rootDir>/../../libs/xmpp-adapter/src/index.ts'
    },
    coverageDirectory: '../../coverage/libs/xmpp-adapter',
};

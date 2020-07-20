module.exports = {
  collectCoverageFrom: ['**/*.js?(x)'],
  coveragePathIgnorePatterns: ['index.js', 'test'],
  moduleNameMapper: {
    '\\.(scss|css)$': '<rootDir>/test/utils/mocks/styleMock.jsx',
    '^.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'identity-obj-proxy',
    '^shared/(.*)$': '<rootDir>/lib/$1',
    '^testUtils/(.+)$': '<rootDir>/test/utils/$1',
  },
  // Ignore npm caching to avoid problems with jest and chalk throwing errors
  // when running in grand central. Fix grabbed from this github issue:
  // https://github.com/facebook/jest/issues/4682#issuecomment-352899677
  modulePathIgnorePatterns: ['npm-cache', '.npm'],
  rootDir: '.',
  setupFiles: ['<rootDir>/test/utils/setupTests.jsx'],
  testMatch: ['<rootDir>/**/*.test.js?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/', '.eslintrc.js'],
};

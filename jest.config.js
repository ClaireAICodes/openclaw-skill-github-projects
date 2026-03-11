module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverage: false,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^execa$': '<rootDir>/test/__mocks__/execa.js'
  },
  testSetup: '<rootDir>/test/setup.js'
};

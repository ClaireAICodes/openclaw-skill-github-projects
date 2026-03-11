// Jest setup file
// Configure global mocks before tests run
const mockExeca = require('./__mocks__/execa');

global.execa = mockExeca;

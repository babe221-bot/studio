/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  moduleNameMapper: {
    // Resolve Next.js path alias @/ → src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Only run tests in src/tests (not in node_modules or .next)
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  // Don't transform node_modules
  transformIgnorePatterns: ['/node_modules/'],
};

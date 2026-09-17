/**
 * Jest configuration. Written in ESM syntax because package.json sets
 * "type": "module".
 *
 * Requires the --experimental-vm-modules flag to run (see the scripts in
 * package.json).
 */

export default {
  testEnvironment: 'node',

  // Collect coverage from every file in src/, not just the ones imported
  // by tests. Otherwise a new file that nothing imports yet would silently
  // drop out of the report instead of showing up as 0%.
  collectCoverageFrom: ['dist/**/*.js'],

  // text -- console output, lcov -- for uploading to Coveralls.
  coverageReporters: ['text', 'lcov']
};

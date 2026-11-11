/**
 * Jest configuration. Written in ESM syntax because package.json sets
 * "type": "module".
 *
 * Requires the --experimental-vm-modules flag to run (see the scripts in
 * package.json).
 */

export default {
  testEnvironment: 'node',

  // Tests import the built package from dist/, so that is what gets
  // instrumented. `npm run build:test` emits source maps, which map the
  // report back to src/*.ts instead of hashed dist/chunk-*.js files.
  //
  // Only the ESM build (*.js) is listed: the CommonJS build (*.cjs) is loaded
  // through Node's native require() and is never instrumented by Jest, so
  // listing it would only add bogus 0% entries. public-api.test.js covers it
  // with smoke tests instead.
  collectCoverageFrom: ['dist/**/*.js'],

  // text -- console output, lcov -- for uploading to Coveralls.
  coverageReporters: ['text', 'lcov']
};

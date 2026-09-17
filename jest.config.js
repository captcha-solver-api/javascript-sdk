/**
 * Jest-конфигурация. Файл в ESM-синтаксисе, потому что в package.json
 * задано "type": "module".
 *
 * Запуск требует флага --experimental-vm-modules (см. скрипты в package.json).
 */

export default {
  testEnvironment: 'node',

  // Считать покрытие по всем файлам src/, а не только по тем, которые
  // импортированы из тестов. Иначе новый файл, который никто не подключил,
  // молча выпадет из отчёта вместо того, чтобы показать 0%.
  collectCoverageFrom: ['dist/**/*.js'],

  // text -- для вывода в консоль, lcov -- для выгрузки в Coveralls.
  coverageReporters: ['text', 'lcov']
};

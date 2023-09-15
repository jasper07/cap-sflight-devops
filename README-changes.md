added the azure-pipelines folder

npm i mbt

wanted to use the better sqlite [mta-sqlite.yaml](mta-sqlite.yaml) so deploy this instead of HANA 
  "build:cf:sqlite": "cp mta-sqlite.yaml mta.yaml && mbt build && rm mta.yaml"


karma tests

add the junit reporter to both apps

npm i karma-junit-reporter karma-coverage

updated the [karma.conf.js](app/travel_processor/karma.conf.js)  files to include reporters and where to log results
```json
    reporters: config.ci ? ['progress', 'junit', 'coverage'] : ["progress"],
    junitReporter: {
      outputDir: '"../../../../test-results/junit',
      outputFile: 'TEST-travel_processor.xml',
      suite: '',
      useBrowserName: true
    },
    coverageReporter: {
      type: 'html',
      dir: '../../../../test-results/coverage'
    },
```

updated [package.json](package.json) to ignore the wdi5 tests and report on coverage and junit
```json
  "jest": {
    ...
    "modulePathIgnorePatterns": [
      "<rootDir>/azure-pipelines/e2e"
    ],
    "collectCoverage": true,
    "collectCoverageFrom": [
      "./srv/**"
    ],
    "coverageDirectory": "./test-results/coverage",
    "coverageThreshold": {
      "global": {
        "lines": 69,
        "functions": 59,
        "statements": -54
      }
    }
  },
  "jest-junit": {
    "suiteNameTemplate": "{filepath}",
    "outputDirectory": "./test-results/junit",
    "outputName": "TEST-cap_server.xml"
  },
```
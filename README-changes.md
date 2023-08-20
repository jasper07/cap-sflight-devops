added the two pipelines

added the pipeline folder

added the e2e folder

npm i mbt


want to use the better sqlite so deploy this instead of HANA 
  "build:cf:sqlite": "cp mta-sqlite.yaml mta.yaml && mbt build && rm mta.yaml"


karma tests

add the junit reporter to both apps

npm i karma-junit-reporter karma-coverage

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
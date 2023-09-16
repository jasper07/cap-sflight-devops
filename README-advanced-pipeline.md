# Advanced Pipeline

1. **Reusability**: The pipeline is designed a starting point for building a reusable CI/CD template that can be employed across multiple development projects
2. **Multi-purpose**: It functions as a reference, showcasing the capabilities of each stage, making it easy to demonstrate what's possible at every step of the development process.
3. **Flexibility**: The pipeline can be adapted to suit different development scenarios, ensuring it's adaptable to specific project requirements.

![Advanced Pipeline](azure-pipelines\docs\advanced-pipeline.png)

[azure-pipelines.yml](azure-pipelines\azure-pipelines.yml)



## Build
As mentioned before this repository builds on a copy of the [SAP-samples/cap-sflight](https://github.com/SAP-samples/cap-sflight) application, the repository already has working github actions, inside which is a [node.js.yml](.github/workflows/node.js.yml) which contains a steps i use in the BUILD stage

![reuse github actions for Build stage](azure-pipelines\docs\advanced-pipeline-build-reuse.png)

#### Lint
The lint settings are as provided in the CAP-SFLIGHT sample

I see a lot of code in the wild that doesnt use linting, a bit of a pet hate, when i do a code review the first thing i normally do is check the lint, often the lint will return 1000s of issues, most of them very easy to fix, leaving just errors. Code that isnt linting is often very hard to reason with, that is hard to follow and find issues, abd creates a lot of unnecessary complexity, either the developer is unfamiliar with a language or framework, experimenting as they go, under tight deadlines and told not needed, or often have personal preferences and habits tht differ from the linting rules SAP CAP and or SAPUI5 provide (NIH not-invented-here).

* linting can improve the code quality and consistency by enforcing a common set of coding standards across the team and company, similar to SAP Code Inspector (SCI/ATC/SLIN etc) in ABAP , set up rules and ensure they adopted before code can be transported
* linting can reduce the number of errors or bugs by detecting and preventing syntax or logic errors, highlighting potential code smells and or security issues
* linting enhances the collaboration and communication among developers by providing, clear and concise feedback on changes, it failed cause you used tabs and not spaces
* including linting in a pipeline can save the time and resources which would other wise be need to review manually.


see [CDS Lint & ESLint](https://cap.cloud.sap/docs/tools/#cds-lint).


#### Unit Tests
With unit tests
* You can isolate, and identify and fix bugs easily.
* You can improve the design and structure of your code and make it more readable and maintainable.
* You get instant feedback and visibility on the test outcomes and code quality metrics.

In the pipeline I used the exising unit tests from the copied application, to get the test results and code coverage to show in the pipeline run summary, I had to make a couple of small changes, I updated the [package.json](package.json) to ignore the wdi5 test files, different runner, and output the test results to the junit format, and for the code coverage gave some settings for acceptable coverage and where to put the coverage results. 

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

in the pipeline yaml to [Review test results](https://learn.microsoft.com/en-us/azure/devops/pipelines/test/review-continuous-test-results-after-build?view=azure-devops)  
[PublishTestResults@2](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines) - Publish test results v2 task was used.
```yaml
  - task: PublishTestResults@2
    displayName: Publish Test Results
    inputs:
        testResultsFormat: "JUnit"
        testResultsFiles: "**/TEST-*.xml"
        mergeTestResults: false
```

![Unit Test Results](azure-pipelines\docs\advanced-pipeline-tests-result.png)



[Review code coverage results](https://learn.microsoft.com/en-us/azure/devops/pipelines/test/review-code-coverage-results?view=azure-devops)  
>Code coverage helps you determine the proportion of your project's code that is actually being tested by tests such as unit tests. To increase your confidence of the code changes, and guard effectively against bugs, your tests should exercise - or cover - a large proportion of your code.  

[PublishCodeCoverageResults@1](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-code-coverage-results-v1?view=azure-pipelines) - Publish code coverage task was used.

```yaml
  - task: PublishCodeCoverageResults@1
    displayName: Publish Code Coverage Results
    inputs:
        codeCoverageTool: Cobertura
        summaryFileLocation: $(System.DefaultWorkingDirectory)/test-results/coverage/cobertura-coverage.xml
```

![Code Coverage Results](azure-pipelines\docs\advanced-pipeline-coverage-result.png)

see [CDS Testing](https://cap.cloud.sap/docs/node.js/cds-test).


#### Integration Tests
With integration tests
* You can verify that your code works as expected and meets the functional and non-functional requirements.
* You can get immediate feedback and visibility on the test outcomes and identify any issues or risks.
* You can automate the testing process and save time and resources.
* You can check that your code integrates well with other components and systems and does not cause any conflicts or errors.

In the pipeline i reused the exising OPA5 Karma tests, for both the applications i added the karma-coverage and karma-junit-reporter npm modules to both the applications.  
```cli
npm install --prefix ./app/travel_processor karma-coverage karma-junit-reporter --save-dev  
```
And to get the output of the tests to be published into the test results and coverage results as mentioned above, in the [karma.conf.js](app/travel_processor/karma.conf.js) the reporters neededd to be added and the output to sent to the same directories as unit tests use. Note there is no custom code in the Fiori apps so no coverage results.
```
config.set({
  ..
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
  ..
});
```
![Integration Tests Results](azure-pipelines\docs\advanced-pipeline-results-integration.png)  
see SAPUI5 [Test Automation](https://sapui5.hana.ondemand.com/#/topic/ae448243822448d8ba04b4784f4b09a0).

#### Buid MTAR
Added the mbt npm package to the project, could easily have added the command in the project. A simple command to use the mta-sqlite.yaml, used the new @cap-js/sqlite, just didnt want the hassle of turning on and off HANA Cloud instance in the BTP free tier.

package.json
```
"build:cf:sqlite": "cp mta-sqlite.yaml mta.yaml && mbt build && rm mta.yaml"

```
azure-pipelines.yml
```
npm install mbt
npm run build:cf:sqlite
```
To share the MTAR file between stages see [Publish and download pipeline Artifacts](https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts?view=azure-devops&tabs=yaml)
```yaml
steps:
- publish: $(System.DefaultWorkingDirectory)/bin/WebApp
  artifact: WebApp

steps:
- download: current
  artifact: WebApp
```

### Deploy
The deploy depends on the success of the build stage, it uses the SAP Piper cfcli docker image to give the pipeline the Cloud Foundry CLI capability needed for deploying. The following declares the container cfcli which points to the [ppiper/cf-cli](https://hub.docker.com/r/ppiper/cf-cli) docker image.
```yaml
containers:
  - container: cfcli
    image: "ppiper/cf-cli"
    options: --user 0:0 --privileged
```

Then in the deploy job the vmimage usses the cfcli container and the Cloud Foundry CLI is available to be used in a bash script.
```yaml
- stage: Deploy
  displayName: Deploy to DEV
  variables:
    - group: cloudfoundry-variables
  dependsOn:
    - Build
  jobs:
    - job: deploy
      pool:
        vmImage: "ubuntu-latest"
      container: cfcli
      steps:
        - checkout: none
        - download: current
          artifact: WebApp
        - bash: |
            cf login -u "$(CF-USER)" -p "$(CF-PASSWORD)" -a "$(CF-API)" -o "$(CF-ORG)" -s "$(CF-SPACE)"
            cf deploy $(Pipeline.Workspace)/WebApp/*.mtar -f

```
Note above the use of the **cloudfoundry-variables** variable group. 
>Variable groups store values and secrets that you might want to be passed into a YAML pipeline or make available across multiple pipelines. You can share and use variable groups in multiple pipelines in the same project.

A number of variable groups have been created for the different values and secrets needed.

![advanced-pipeline-library-variable-groups.png](azure-pipelines\docs\advanced-pipeline-library-variable-groups.png)
see [Add & use variable groups](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops&tabs=yaml).
### Scan

static vs lint, lint enforces best practices, static does more like checks for bad practices and vulnerabilities

### E2E Tests

#### Browser Stack

#### K6 Performance Tests | 5234       |5234       |

### Upload

#### Upload to CTMS | 5234       |5234       |

#### References

Pipeline source [azure-pipelines-simple.yml](azure-pipelines\azure-pipelines-simple.yml)  
NPM package for the [Cloud MTA Build Tool](https://www.npmjs.com/package/mbt)  
Project Piper Cloud Foundry CLI docker image[https://hub.docker.com/r/ppiper/cf-cli](https://hub.docker.com/r/ppiper/cf-cli)
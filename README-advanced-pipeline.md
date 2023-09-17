# Advanced Pipeline
- [Build](#build)
   - [Lint](#lint)
   - [Unit Tests](#unit-tests)
   - [Integration Tests](#integration-tests)
   - [Buid MTAR](#build-mtar)
- [Deploy](#deploy)
- [Scan](#scan)
   - [Templates and conditional parameters](#templates-and-conditional-parameters)
   - [Snyk Security Scan](#snyk-security-scan)

- [E2E Tests](#e2e-tests)
   - [Browser Stack](#browser-stack)
   - [K6 Performance Tests](#k6-tests)

- [Upload](#upload)
   - [Upload to CTMS](#upload-to-ctms)

*Hypothetical Scenario*:
The travel processing application is now in production and is being used by thousands of users. There are sporadic peak load times due to increased demand during holidays and special events. The development team understands the critical need for a robust and reliable CI/CD pipeline to maintain the application's performance and security.

1. **Quality Assurance**: this pipeline ensures code quality and security, reducing the likelihood of critical issues.
2. **Comprehensive Testing**: Extensive testing, including integration, security, end-to-end and performance checks, guarantees a robust application.
3. **Adaptability**: The pipeline is built using templates and conditional parameters. This design allows the team to easily modify or extend pipeline stages to accommodate evolving project requirements.
4. **Demonstration**: Developers can see the full CI/CD process in action, making it easier for new team members to learn and adapt.
5. **Reusable Template**: The pipeline serves as a reusable template for other projects within the enterprise, promoting consistency and best practices across the organization.

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
**[Back to the Top](#advanced-pipeline)**

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

> Code coverage helps you determine the proportion of your project's code that is actually being tested by tests such as unit tests. To increase your confidence of the code changes, and guard effectively against bugs, your tests should exercise - or cover - a large proportion of your code.

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
**[Back to the Top](#advanced-pipeline)**
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

```js
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

**[Back to the Top](#advanced-pipeline)**
#### Buid MTAR

Added the mbt npm package to the project, could easily have added the command in the project. A simple command to use the mta-sqlite.yaml, used the new @cap-js/sqlite, just didnt want the hassle of turning on and off HANA Cloud instance in the BTP free tier.

package.json

```sh
"build:cf:sqlite": "cp mta-sqlite.yaml mta.yaml && mbt build && rm mta.yaml"


```

azure-pipelines.yml

```sh
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
**[Back to the Top](#advanced-pipeline)**
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

> Variable groups store values and secrets that you might want to be passed into a YAML pipeline or make available across multiple pipelines. You can share and use variable groups in multiple pipelines in the same project.

A number of variable groups have been created for the different values and secrets needed.

![advanced-pipeline-library-variable-groups.png](azure-pipelines\docs\advanced-pipeline-library-variable-groups.png)
see [Add & use variable groups](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops&tabs=yaml).   
**[Back to the Top](#advanced-pipeline)**
### Scan

#### Templates and conditional parameters

In this stage we introduce templates and conditional parameters.
Azure DevOps templates are a way of defining reusable content, logic, and parameters in YAML pipelines. They can help you speed up development, secure your pipeline, and avoid repeating the same code in multiple places.
You can use conditions to specify when a template, a stage, a job, or a step should run or not. Conditions are written as expressions in YAML pipelines.

```yaml
# File: templates/npm-steps.yml
parameters:
  - name: runTest
    type: boolean
    default: false

steps:
  - script: npm install
  - ${{ if eq(parameters.runTest, true) }}:
    - script: npm test

```

This template defines a parameter called runTest that is a boolean value and defaults to false. It also defines two steps that run npm install and npm test commands. The second step only runs if the parameter runTest is true.

```yaml
# File: azure-pipelines.yml
jobs:
  - job: Linux
    pool:
      vmImage: 'ubuntu-latest'
    steps:
      - template: templates/npm-steps.yml # Template reference
        parameters:
          runTest: true # Override the default value of the parameter

```

This YAML file uses the template with the parameter runTest set to true. This means that both steps in the template will run for the Linux job.  
See [Template usage reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/templates?view=azure-devops&pivots=templates-includes)  
**[Back to the Top](#advanced-pipeline)**

#### Snyk Security Scan
Snyk is a popular security platform and tool that specializes in identifying and mitigating security vulnerabilities and issues in software applications and their dependencies. It provides a comprehensive approach to security by focusing on open-source libraries and third-party components, helping organizations proactively manage and remediate vulnerabilities.

Snyk is one of many extensions that are available in the Azure Devops marketplace, easy to sing up for free and get a Snyk Api token needed to integrate a task in your pipeline.

Benefits of using such as tool -  
**Vulnerability Detection**: Identifies security vulnerabilities and issues within your code and dependencies.  
**Early Detection**: Scans code during development, catching vulnerabilities before they reach production.  
**Automatic Remediation**: Provides actionable steps to fix vulnerabilities and can even automate the remediation process.  
**Dependency Security**: Ensures the security of third-party dependencies and open-source libraries.  
**Compliance**: Helps maintain compliance with security standards and regulations.   
**Shift Left Security**: Integrates security earlier in the development process.  
**Continuous Monitoring**: Supports ongoing security monitoring as code changes are pushed.  
**Enhanced Security Awareness**: Increases security awareness among developers.  
**Improved Code Quality**: Addresses not just security but also code quality issues.  
**Customizable and Integratable**: This is common, the service can be tailored to specific enterprise needs and then integrated into CI/CD pipelines.  
**Cost Savings**: Prevents costly security breaches and downtime.  

The SnykSecurityScan task simple to use. See [Example of a Snyk task to test a node.js (npm)-based application](https://docs.snyk.io/integrations/snyk-ci-cd-integrations/azure-pipelines-integration/example-of-a-snyk-task-to-test-a-node.js-npm-based-application)

```yaml
# File: azure-pipelines/azure-pipelines.yml
variables:        # a collection of flags to turn on and off the jobs and steps
  securityscan.enabled: true # run the security scan

- stage: Scan
  displayName: Security Scan
  dependsOn:
    - Deploy
  jobs:
    - job: scan
      steps:
        - template: templates/steps/snykSecurityScan.yml
          parameters:
              runJob: variables['securityscan.enabled']
```

The Scan task is 
```yaml
# File: azure-pipelines/templates/steps/snykSecurityScan.yml
parameters:
 - name: runJob
   type: string
   default: false

steps:
- task: SnykSecurityScan@1
  condition: eq(${{ parameters.runJob }}, 'true')
  inputs:
    serviceConnectionEndpoint: "Snyk API"  #Service Connection name in project settings
    testType: "app"
    monitorWhen: "never"
    failOnIssues: true
    projectName: "$(Build.Repository.Name)"
```

![advanced-pipeline-security-scan.png](azure-pipelines\docs\advanced-pipeline-security-settings.png)
Register a service connection in the Project Settings and give it you Snyk API token

![advanced-pipeline-security-scan.png](azure-pipelines\docs\advanced-pipeline-security-scan.png)  
Here is an example of a known vulnerability in scan results.  
**[Back to the Top](#advanced-pipeline)**

### E2E Tests


**[Back to the Top](#advanced-pipeline)**
#### Browser Stack


**[Back to the Top](#advanced-pipeline)**
#### K6 Performance Tests


**[Back to the Top](#advanced-pipeline)**
### Upload


**[Back to the Top](#advanced-pipeline)**
#### Upload to CTMS

#### References

Pipeline source [azure-pipelines-simple.yml](azure-pipelines\azure-pipelines-simple.yml)  
NPM package for the [Cloud MTA Build Tool](https://www.npmjs.com/package/mbt)  
Project Piper Cloud Foundry CLI docker image[https://hub.docker.com/r/ppiper/cf-cli](https://hub.docker.com/r/ppiper/cf-cli)
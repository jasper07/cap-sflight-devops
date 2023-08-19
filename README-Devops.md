want to make it easier to test, so use sqllite instead of hana cloud
created mta-sqlite.yaml
use command build:cf:sqlite to build and run the app using sqllite

# whats in the pipeline
- Lint - checks all code (CDS / Nodejs/ UI5) confirms with applicable lint rules
- SAST - security checks for vulnerablities and obselete opensource
- Unit test - runs the CDS unit tests
- integration tests - Manage Travels - runs karma tests in headless chrome for - Processing app 
- integration tests - Analyze Bookings - runs karma tests in headless chrome for ALP app 
- Build MTA - builds app for SQLite
- Publish MTA where can be used in other tasks
- Publish code coverage to the pipeline summary
- Publish unit tests to the pipeline summary 



## TODO 

- create a template or custom task for the upload to CTMS task
- add e2e task - how does the browser version work?? 
    - https://www.project-piper.io/steps/seleniumExecuteTests/ 
    - i think it needs to be running on a separate docker preferably windows with chrome
    - https://github.com/microsoft/axe-pipelines-samples/blob/main/typescript-selenium-webdriver-sample/azure-pipelines.yml good example
        - shows how to pass in env into test win/chrome vs ubu/ff
- make upload dependent on E2E tests
- add husky tasks
- azure test plans https://webdriver.io/docs/gmangiapelo-wdio-azure-devops-service/
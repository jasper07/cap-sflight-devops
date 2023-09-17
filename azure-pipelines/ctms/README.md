#### Upload to CTMS

This job allows you to integrate your Azure Devops pipeline with the SAP Cloud Transport Management Service (CTMS).
It uploads the Multi Target Application archive (mtar) created in the Build stage and then imports it into the tartget CTMS Nodes queue ready for import.

The benefits of including CTMS into your CI/CD pipeline.
* Enterprise-ready change and release management process
* Audit trail of changes and transports
* Separation of concerns between developers and operators

The prerequisites: 
* You have an instance of Cloud Transport Management 
* [Set Up the Environment to Transport Content Archives directly in an Application
](https://help.sap.com/docs/cloud-transport-management/sap-cloud-transport-management/set-up-environment-to-transport-content-archives-directly-in-application).    
This provides the Client_ID and CLIENT_SECRET values needed for calling the [TMS API file upload](https://api.sap.com/api/TMS_v2/path/FILE_UPLOAD_V2) service.


The following is the configuration block in the main pipeline. Set uploadToCtms.enabled to "true" to enable.
``` yaml
  # File: azure-pipelines/azure-pipelines-advanced.yml
  - stage: Upload
    displayName: Upload to TMS queue
    dependsOn:
      - E2E_tests
    variables:
      - group: ctms-variables
    jobs:
      - template: templates/jobs/uploadToCtms.yml
        parameters:
          runJob: variables['uploadToCtms.enabled']
          ctmsNode: QAS_MTA    #The Node you want the MTAR to be added to 
```
Above shares a variable group **ctms_variables**
![ctms-variables](../docs/advanced-pipeline-ctms-variables.PNG)  


| KEY           | Value                                                                          |
|---------------|--------------------------------------------------------------------------------|
| CLIENT_ID     | comes from the **Service Instance Service Key**                                |
| CLIENT_SECRET | comes from the **Service Instance Service Key**                                |
| TMS_API       | https://transport-service-app-backend.ts.cfapps.\<region\>.hana.ondemand.com/v2  |
| TOKEN_URL     | https://\<myctmsinstance\>.authentication.\<region\>.hana.ondemand.com/oauth/token |

The pipeline calls a template [azure-pipelines/templates/jobs/uploadToCtms.yml](azure-pipelines/templates/jobs/uploadToCtms.yml) which downloads the MTAR artifact created in the build stage and uses it to call **TMS_API** authenticated using the **TOKEN_URL** with the **CLIENT_ID** and **CLIENT_SECRET** provided via the shared environment variables.

``` yaml
 # File: azure-pipelines/templates/jobs/uploadToCtms.yml
parameters:
  - name: ctmsNode #The node you want to load the *.mtar file
    type: string
    default: QAS_MTA
  - name: runJob #Run the job or not
    type: string
    default: true
jobs:
  - job: uploadToCtms
    condition: eq(${{ parameters.runJob }}, 'true')
    steps:
      - checkout: self
      - script: npm install
        displayName: NPM install
      - download: current
        artifact: WebApp
      - script: npm run ctmsupload
        workingDirectory: $(System.DefaultWorkingDirectory)/azure-pipelines/ctms
        env:
          TMS_API: $(TMS_API) #ctms-variables
          TOKEN_URL: $(TOKEN_URL) #ctms-variables
          CLIENT_ID: $(CLIENT_ID) #ctms-variables
          CLIENT_SECRET: $(CLIENT_SECRET) #ctms-variables
          CTMS_NODE: ${{ parameters.ctmsNode }} #The Node to upload
          USER_NAME: $(Build.RequestedForEmail) #Email address of the GIT committer
          DESCRIPTION: "$(Build.DefinitionName): $(Build.SourceVersionMessage)" #RepoName - GIT Message
          MTA_PATH: "$(Pipeline.Workspace)/WebApp" #Where to find the MTAR file
        displayName: Upload to CTMS
```


Job log shows 'Transport request 463 was created in Node QAS_MTA.
![alt text](/azure-pipelines/docs/ctms_joblog.PNG "Title")

QAS_MTA CTMS Node note the Transport Description is made up of the "pipeline name" and the "commit message" and the Owner is the person who made the commit.
![alt text](/azure-pipelines/docs/ctms_qa_queue.PNG "Title")  
NOTE the Transport Description is the name of the project - and the git commit that triggered the build
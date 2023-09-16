
## Simple Pipeline
Using a simple build and deploy CI/CD pipeline has many advantages
* by automating a manual process it gives back time to the developer, on average the build and deploy process takes 4 minutes, the developer is notified by email of success or failure, the time saved encourages the developer to do more often
* the pipeline can be used as building block for adding syntax checking and testing where needed


![Simple Pipeline](azure-pipelines\docs\simple-pipeline.png)

Once the code is pushed to the main branch of the git the repository, the pipeline is triggered.

Build is the first stage in the pipeline, it pulls down the source code from the git repository, does an npm install which provides the multi target build tool (mbt), the mbt tool is used to build the multi target (mtar) archive, once the archive is built it is stored for later use, the Build stage is complete.

The Deploy stage pulls down the published archive andthe project piper docker provides the Cloud Foundry CLI needed to run the deploy command, the deploy command pushes the archive to the BTP Cloud Foundry development environment, this is specified in the API, user, password, org and space environment variables. Environment variables can be used to securely share secrets accross many pipelines.

![Simple Pipeline Explained](azure-pipelines\docs\simple-pipeline-explained.png)

Once the deploy stage is complete an email is sent to the developer informing them of a success or failure

![Simple Pipeline email](azure-pipelines\docs\simple-pipeline-results.png)

from the email we can follow the link to check the pipeline results, here we see the archive was successfully deploy and we can see the link to the download mta operation logs, dmol for short, if for example the deploy failed because the user wasnt properly authenticated we could re-run the deploy stage as the archive is store in the results, there are retention policy settings which specify how long and what is stored, by default i think runs are stored for 30 days

![Simple Pipeline logs](azure-pipelines\docs\simple-pipeline-deploylogs.png)



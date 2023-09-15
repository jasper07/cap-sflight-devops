const wdioConfig = require("./wdio.conf.js");

// this will run tests for both MicrosoftEdge and Chrome in parallel
wdioConfig.config.maxInstances = 2;
const edgeCapability = {
    "wdi5:authentication": {
        provider: "BTP", //> mandatory
        usernameSelector: "#j_username",
        passwordSelector: "#j_password",
        submitSelector: "#logOnFormSubmit"
    },
    acceptInsecureCerts: true,
    // Edge Settings
    maxInstances: 2,
    browserName: "MicrosoftEdge",
    "ms:edgeOptions": {
        args:
            process.argv.indexOf("--headless") > -1
                ? ["--headless", "--InPrivate", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=1900,1080"] :
                ["--InPrivate", "--disable-gpu", "--disable-dev-shm-usage", "--start-maximized", "--window-size=1900,1080"]
    }
};

wdioConfig.config.capabilities.unshift(edgeCapability)
wdioConfig.config.services.unshift("edgedriver")

wdioConfig.config.logLevel = "error"
wdioConfig.config.waitforTimeout = 150000
exports.config = wdioConfig.config;
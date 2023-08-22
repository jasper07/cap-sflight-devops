const wdioConfig = require("./wdio.conf.js");
const { BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY, BROWSERSTACK_BUILD_NAME } = process.env;


const desktopCapabilities = {
    'bstack:options': {
        "os": "Windows",
        "osVersion": "11",
        "browserVersion": "latest",
        "projectName": "cap-sflight",
        "buildName": BROWSERSTACK_BUILD_NAME,
        "resolution": "1024x768",
        "sessionName": "Parallel_Test"
    }
};



const authentication = {
    "wdi5:authentication": {
        provider: "BTP", //> mandatory
        usernameSelector: "#j_username",
        passwordSelector: "#j_password",
        submitSelector: "#logOnFormSubmit"
    }
}

let capabilities = [
    {
        ...authentication,
        ...desktopCapabilities,
        browserName: 'Chrome'
    // },
    // {
    //     ...authentication,
    //     ...desktopCapabilities,
    //     browserName: 'Edge'
    }
];


wdioConfig.config.capabilities = capabilities
wdioConfig.config.reporters = ['spec']
wdioConfig.config.services = [["browserstack", { browserstackLocal: true, forcestop: true }], "ui5"]
wdioConfig.config.user = BROWSERSTACK_USERNAME;
wdioConfig.config.key = BROWSERSTACK_ACCESS_KEY;


wdioConfig.config.logLevel = "error"
wdioConfig.config.waitforTimeout = 10000;
exports.config = wdioConfig.config;
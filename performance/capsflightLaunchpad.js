/*global __ENV*/
import http from 'k6/http'
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";
import { loadDotEnv } from './dotenv.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export const errorRate = new Rate('errors');
loadDotEnv()
const BASE_URL = 'https://secondphase.launchpad.cfapps.ap10.hana.ondemand.com';
const APPID = '00202967-9d5e-484c-ac27-56f294444cfc.sapfecapsflight.sapfecaptravel/processor'

// 1. init code
export let options = {
    stages: [
        { target: 10, duration: "30s" }, // Linearly ramp up from 1 to 10 VUs (virtual users) during first minute
        // { target: 10, duration: "30s" }, // Hold at 10 VUs for the next 30 seconds
        // { target: 0, duration: "30s" }     // Linearly ramp down from 10 to 0 VUs over the last 30 seconds
        // // Total execution time will be ~2 minutes
    ],
    thresholds: {
        "http_req_duration": ["p(95)<500"], // We want the 95th percentile of all HTTP request durations to be less than 500ms
        "http_req_duration{staticAsset:yes}": ["p(99)<250"], // Requests with the staticAsset tag should finish even faster eg SAPUI5 CDN
    }
};

// const start = Date.now();
const DEBUG = __ENV.DEBUG; //enviroment variable for logging 

const DebugOrLog = (textToLog) => {
    if (DEBUG) {
        // var millis = Date.now() - start; // we get the ms ellapsed from the start of the test
        // var time = Math.floor(millis / 1000); // in seconds
        console.log(`${textToLog}`);
    }
}
// const loginData = JSON.parse(open("./users.json"));

// 2. setup vu
export function setup() {
    DebugOrLog(`== SETUP START btp launchpad authentication - default IDP=====================`)
    //Authentication is always the hardest thing, need to simulate how a browser works, lots of redirects and cookies
    // OKta, Ping and Azure AD i found a lot easier than the SAP Default IDP and interal IAS :-( 
    let vuJar = http.cookieJar();
    // let credentials = loginData.users[Math.floor(Math.random() * 1)];
    const credentials = {
        username: __ENV.K6_USERNAME,
        password: __ENV.K6_PASSWORD
    }
    DebugOrLog("url 1 " + BASE_URL) //https://secondphase.launchpad.cfapps.ap10.hana.ondemand.com
    let res = http.get(BASE_URL);

    // extract values from the javascript in response which would normally set needed cookies
    let [groupinput, signature, redirect] = /signature=(.*?);path=\/;Secure;SameSite=None;";location="(.*)"/.exec(res.body);

    check(res, {
        "has value 'signature'": () => groupinput.length && signature.length > 0,
        "has value 'redirect '": () => redirect.length > 0
    });

    // set cookies so the auth remembers the location to goto at the end of saml oauth dance
    vuJar.set(BASE_URL, 'signature', signature);
    vuJar.set(BASE_URL, 'fragmentAfterLogin', '');
    vuJar.set(BASE_URL, 'locationAfterLogin', '%2Fsite'); //this got me good, on returning to base url it will goto a default place, need this!!

    DebugOrLog("url 2 " + redirect) // https://secondphase.authentication.ap10.hana.ondemand.com/oauth/authorize?response_type=code..
    res = http.get(redirect);

    DebugOrLog("url 3 " + res.url) //https://secondphase.authentication.ap10.hana.ondemand.com/login

    // get redirect from meta tag
    redirect = decodeURI(res.html().find('meta[name=redirect]').attr('content'));
    DebugOrLog("url 4 " + redirect) //https://accounts.sap.com/oauth2/authorize?client_id=....
    res = http.get(redirect);

    DebugOrLog("url 5 " + res.url) //https://accounts.sap.com/saml2/idp/sso?sp=uaa
    res = res.submitForm();
    DebugOrLog("url 6 " + res.url) //https://accounts.sap.com/saml2/idp/sso

    // stop from trying to register biometric authentication by setting a cookie
    vuJar.set(res.url, 'skipPasswordlessAuthnDeviceConfig', 'true');

    res = res.submitForm({
        fields: { j_username: credentials.username, j_password: credentials.password }
    });

    DebugOrLog("url 7 " + res.url) //https://secondphase.launchpad.cfapps.ap10.hana.ondemand.com/site
    // if you dont want to do the authentication, grab these two cookies from a logged in user JSESSIONID & __VCAP_ID__'
    check(res, {
        "status is 200'": () => res.status === 200,
        "redirected back to start": () => res.url.indexOf(BASE_URL) > -1,
        "has 'JSESSIONID' cookie": () => vuJar.cookiesForURL(res.url)['JSESSIONID'].length > 0,
        "has '__VCAP_ID__' cookie": () => vuJar.cookiesForURL(res.url)['__VCAP_ID__'].length > 0,
    });
    DebugOrLog(`== SETUP END  btp launchpad authentication - default IDP===============`)
    return vuJar.cookiesForURL(res.url);
}

// 3. virtual user tests
export default function main(cookiesForURL) {
    const processorApp = `${BASE_URL}/${APPID}`;
    let res;
    let vuJar = http.cookieJar();
    for (const property in cookiesForURL) {
        vuJar.set(BASE_URL, property, cookiesForURL[property]);
    }

    group('create flight', () => {
        const params = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        let payload = {};
        //create draft and capture the uuid
        res = http.post(`${processorApp}/Travel`, JSON.stringify(payload), params)

        let { TravelUUID, IsActiveEntity, TravelID } = JSON.parse(res.body);
        check(res, {
            "Draft created'": () => res.status === 201
        }) || errorRate.add(1);

        let beginDate = new Date();
        let endDate = new Date(Date.now() + 6.048e+8);

        // add values to the draft
        payload = {
            "to_Agency_AgencyID": "070006",
            "to_Customer_CustomerID": "000001",
            "Description": "Travel for deletion",
            "BookingFee": "50",
            "CurrencyCode_code": "USD",
            "BeginDate": beginDate.toISOString().split("T")[0],
            "EndDate": endDate.toISOString().split("T")[0]
        };

        res = http.patch(`${processorApp}/Travel(TravelUUID='${TravelUUID}',IsActiveEntity=${IsActiveEntity})`, JSON.stringify(payload), params)
        check(res, {
            "Draft updated'": (r) => r.status === 200
        }) || errorRate.add(1);

        payload = {};
        res = http.post(`${processorApp}/Travel(TravelUUID='${TravelUUID}',IsActiveEntity=${IsActiveEntity})/TravelService.draftActivate`, JSON.stringify(payload), params);
        check(res, {
            "Draft activated'": (r) => r.status === 201
        }) || errorRate.add(1);

        IsActiveEntity = JSON.parse(res.body).IsActiveEntity;
        TravelID = JSON.parse(res.body).TravelID;

        //confirm
        res = http.get(encodeURI(`${processorApp}/Travel?$count=true&$filter=TravelID eq ${TravelID}`))
        check(res, {
            "TravelID found'": (r) => parseInt(JSON.parse(r.body)["@odata.count"], 0) === 1
        }) || errorRate.add(1);

        //delete
        res = http.del(`${processorApp}/Travel(TravelUUID='${TravelUUID}',IsActiveEntity=${IsActiveEntity})`)
        check(res, {
            "TravelID deleted'": (r) => r.status === 204
        }) || errorRate.add(1);

        sleep(0.5);
        //confirm delete
        res = http.get(encodeURI(`${processorApp}/Travel?$count=true&$filter=TravelID eq ${TravelID}`))
        check(res, {
            "TravelID deletion confirmed'": (r) => parseInt(JSON.parse(r.body)["@odata.count"], 0) === 0
        }) || errorRate.add(1);
    });
}

// 4. teardown code
export function teardown() {
}

export function handleSummary(data) {
    console.log(location)
    return {
        'result.html' : htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
    };
}
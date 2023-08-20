const FormData = require('form-data');
const fs = require('fs');
const qs = require('qs');
const axios = require('axios');
// const dotenv = require('dotenv');
// dotenv.config();

const TMS_API = process.env.TMS_API;
const TOKEN_URL = process.env.TOKEN_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CTMS_NODE = process.env.CTMS_NODE
const USER_NAME = process.env.USER_NAME;
const DESCRIPTION = process.env.DESCRIPTION;
const MTA_PATH = process.env.MTA_PATH || process.argv[2];

const STATUS = { Initial: 'in' };

//https://api.sap.com/api/TMS_v2/path/FILE_UPLOAD_V2
//https://help.sap.com/docs/cloud-transport-management/sap-cloud-transport-management/creating-service-instance-and-service-key
const getBearerToken = async () => {
    const encodedToken = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    try {
        const res = await axios.request({
            url: TOKEN_URL,
            method: "post",
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + encodedToken
            },
            data: qs.stringify({
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID
            })
        })
        return res.data;
    } catch (err) {
        console.error(err);
    }
}

const uploadMTA = async (namedUser, fileName) => {
    const form = new FormData();
    form.append('namedUser', namedUser);

    // provide the directory of the published archive then find only mtar in there 
    let filePath = fileName;
    if (!filePath.includes(".mtar")) {
        try {
            const mtaArchives = fs.readdirSync(filePath);
            if (mtaArchives.length === 1 && mtaArchives[0].includes(".mtar")) {
                filePath = fileName + "/" + mtaArchives[0];
            }
        } catch (err) {
            console.log(err)
        }
    }

    form.append('file', fs.createReadStream(filePath));
    try {
        const { data } = await axios.request({
            url: `${TMS_API}/files/upload`,
            method: "post",
            headers: {
                ...form.getHeaders()
            },
            data: form
        });
        return data;
    } catch (err) {
        console.error(err);
    }
};

const getTransportsInNode = async (nodeId, status) => {
    let url = `${TMS_API}/nodes/${nodeId}/transportRequests?status=${status}&nodeId=${nodeId}`;
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (err) {
        console.error(err);
    }
};

const uploadFileToNode = async (uri, namedUser, nodeName) => {
    let body = {
        "nodeName": nodeName,
        "contentType": "MTA",
        "storageType": "FILE",
        "entries": [
            {
                "uri": uri
            }
        ],
        "description": `${DESCRIPTION}`,
        "namedUser": namedUser
    }

    let url = `${TMS_API}/nodes/upload`;
    try {
        const res = await axios.request({
            url: url,
            headers: {
                'Content-type': 'application/json'
            },
            method: "post",
            data: JSON.stringify(body)
        });
        return res.data;
    } catch (err) {
        console.error(err);
    }
};

const ctmsUpload = async () => {
    const { access_token } = await getBearerToken();
    if (access_token) {
        axios.defaults.headers.common = { 'Authorization': `Bearer ${access_token}` };
        const { fileId, fileName } = await uploadMTA(USER_NAME, MTA_PATH);
        const uploadFileToNodeResponse = await uploadFileToNode(fileId, USER_NAME, CTMS_NODE);
        //'hello-world_1.0.0.mtar' successfully uploaded to Node 'MTA_QA (Id: 204)'
        console.log(`'${fileName}' successfully uploaded to Node '${uploadFileToNodeResponse.queueEntries[0].nodeName} (Id: ${uploadFileToNodeResponse.queueEntries[0].nodeId})'`);

        let nodeId = uploadFileToNodeResponse.queueEntries[0].nodeId;
        //verify request created and in queue
        const { transportRequests } = await getTransportsInNode(nodeId, STATUS.Initial);
        const transportRequest = transportRequests.find(tr => tr.id === uploadFileToNodeResponse.transportRequestId);
        //Tranpsort Request '591' created in Node 'MTA_QA'
        console.log(`Tranpsort Request '${transportRequest.id}' created in Node '${transportRequest.origin}'`);
    }
}
ctmsUpload ();
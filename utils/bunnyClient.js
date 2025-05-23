import fs from 'fs';
import fetch from 'node-fetch';

const ACCESS_KEY = '67d20cc3-25b7-41c8-a4afc3b62eb1-bed1-42f4';
const STORAGE_ZONE_NAME = 'mangaraw';
const BUNNY_STORAGE_URL = 'https://storage.bunnycdn.com';


/**
 * Upload image to BunnyCDN storage
 * @param {string} filePath - File location
 * @param {string} saveToFile - Save as file name
 * @returns {Promise}
 */
const uploadImage = async (filePath, saveToFile) => {

    let stream = null;

    if (!filePath.startsWith('http')) {
        filePath = fs.realpathSync(filePath);
        stream = fs.createReadStream(filePath);
    } else {
        const response = await fetch(filePath).then((response) => {
            return response.arrayBuffer();
        }).catch((error) => {
            throw new Error(error);
        });

        stream = Buffer.from(response);
    }

    const response = await fetch(`${BUNNY_STORAGE_URL}/${STORAGE_ZONE_NAME}/${saveToFile}`, {
        method: 'PUT',
        headers: {
            'AccessKey': ACCESS_KEY,
            'Content-Type': 'application/octet-stream',
        },
        body: stream,
    }).then((response) => {
        return response.json();
    });

    return response;
}

const deleteFile = async (filePath) => {
    const response = await fetch(`${BUNNY_STORAGE_URL}/${STORAGE_ZONE_NAME}${filePath}`, {
        method: 'DELETE',
        headers: {
            'AccessKey': ACCESS_KEY,
        },
    }).then((response) => {
        return response.json();
    }).catch((error) => {
        throw new Error(error);
    });

    return response;
}

export { uploadImage, deleteFile };

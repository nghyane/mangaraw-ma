import { uploadImage, deleteFile } from "./utils/bunnyClient.js";
import pLimit from "p-limit";
import fs from "fs";


const limit = pLimit(5);

const files = [
    'images/2.png',
    'images/3.png',
    'images/4.png',
    'images/5.png',
    'images/6.png',
    'images/7.png',
    'images/8.png',
    'images/9.png',
    'images/10.png',
    'images/11.png',
    'images/12.png',
    'images/13.png',
    'images/14.png',
    'images/15.png',
];

const promises = files.map((file, i) => {
    file = fs.realpathSync(file);

    return limit(async () => {
        console.log(`Uploading ${file}`);

        const upload = await uploadImage(file, `/files/${i}.png`)

        if (upload.HttpCode >= 300) {
            throw new Error('Upload failed');
        }

        return `files/${i}.png`;
    });
});

await Promise.all(promises).then((responses) => {
    console.log(responses);

}).catch(async (error) => {
    await deleteFile('/files/')

    throw new Error(error);
});
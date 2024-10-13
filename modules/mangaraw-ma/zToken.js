import redisClient from '../../utils/redisClient.js';

const API_URL = 'https://mangaraw.ma/api/v1/m/t';

const getZToken = async () => {
    const zToken = await redisClient.get('zToken');

    if (zToken) {
        return zToken;
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://mangaraw.ma',
            'Referer': 'https://mangaraw.ma/',
        },
    }).then((response) => response.json()).catch((error) => {
        throw new Error(error);
    });

    if (response.error) {
        throw new Error(response.error);
    }

    await redisClient.set('zToken', response.t, 'EX', 60); 

    return response.t;
}

export default getZToken;


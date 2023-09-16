import { createClient } from 'redis';

const redisClient = createClient();
redisClient.on('error', err => console.error('Redis client error', err));
await redisClient.connect();

const result = await redisClient.scan(0, 'staff:', 1000);
console.log('scan result: ', result);
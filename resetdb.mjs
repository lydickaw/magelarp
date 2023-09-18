import { createClient } from 'redis';

const redisClient = createClient();
redisClient.on('error', err => console.error('Redis client error', err));
await redisClient.connect();

await redisClient.flushDb();
console.log('Database reset complete.');
import {createClient} from "redis";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined in the environment variables');
}

const redisClient = createClient({
    url: process.env.REDIS_URL
})

const connectRedis = async () => {
    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    try {
    await redisClient.connect();
        console.log("Redis connection successful.");
    } catch (error) {
        console.error("Redis connection error: ", error);
        process.exit(1);
    }
}

connectRedis();

export default redisClient;
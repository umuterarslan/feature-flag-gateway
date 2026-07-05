import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function connectDB() {
    try {
        await prisma.$connect();
        console.log('Database connection successful');
    } catch (error) {
        console.error('PostgreSQL connection error: ', error);
        process.exit(1);
    }
}

connectDB();

export default prisma;

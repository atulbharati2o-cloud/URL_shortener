import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongoDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    await mongoose.connect(
        env.mongodbUrl,
        {
            dbName: env.mongodbDatabase,
            serverSelectionTimeoutMS: 5000,
        },
    );

    console.log(
        `MongoDB connected to database: ${env.mongodbDatabase}`,
    );
}
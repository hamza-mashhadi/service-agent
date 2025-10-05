import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { config } from '../config';

const MONGODB_URI = config.mongodbUri;

export async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectMongoDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}

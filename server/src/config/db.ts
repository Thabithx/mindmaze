import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb+srv://thabith2222_db_user:hsWVHNWWQLlFGybY@cluster0.z84syca.mongodb.net/mindmaze?retryWrites=true&w=majority';
    const conn = await mongoose.connect(connStr);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Connection Error:', error);
    process.exit(1);
  }
};

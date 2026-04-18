import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobhunter';
let connectPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectPromise) return connectPromise;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  connectPromise = mongoose.connect(MONGODB_URI);

  try {
    await connectPromise;
    console.log('MongoDB connected:', mongoose.connection.host);
    return mongoose.connection;
  } catch (err) {
    connectPromise = null;
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

export default connectDB;

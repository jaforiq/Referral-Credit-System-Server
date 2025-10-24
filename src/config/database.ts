import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    //const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/referral-system';
    const mongoUri = 'mongodb+srv://jaforiqbal5593_db_user:epgvkP0AVzIKkRNj@cluster0.czgerf5.mongodb.net/referral-system?retryWrites=true&w=majority&appName=Cluster0"';
    
    console.log('Connecting to mongoUri:', mongoUri);
    await mongoose.connect(mongoUri);
     
    console.log('MongoDB Connected Successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};
import mongoose from "mongoose";
import dotenv from "dotenv";


dotenv.config();
// Connect to MongoDB   using environment variables for the connection string
const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

function _connectToDB() {
    mongoose.connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
        .then(() => console.log('MongoDB Atlas Connected Successfully'))
        .catch(err => console.error('Connection error:', err));
}


export { _connectToDB };
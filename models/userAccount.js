import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },

    // ✅ Friend System Fields
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    requestsSent: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    requestsReceived: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;

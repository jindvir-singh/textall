import User from '../models/userAccount.js'
import { generateToken, authenticateJWT, requireAuth, logoutUser } from '../middlewares/auth.js'


async function _createUserAccount(req, res) {
    const { username, email, password, gender } = req.body;

    // Check if all required fields are provided
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    } else if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    } else if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    } else if (!gender) {
        return res.status(400).json({ error: 'Gender is required' });
    }

    const newUser = new User({
        username: username,
        email: email,
        password: password, // Ideally, hash passwords before storing
        gender: gender,
    });

    await newUser.save();
    console.log("User created successfully:", newUser);

    // const token = generateToken(username);

    // res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'Strict' });

    return res.status(201).json({ message: 'user created successfully' })
}


// to add password checking later
async function _loginUser(req, res) {
    const { username } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            const token = generateToken(username);

            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'Strict' });
            return res.status(200).json({ message: 'user verified successfully' })
        }
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ error: 'Server error' });
    }
}

async function _getAllUsers(req, res) {
    try {
        const currentUserId = req.user.userId;

        const users = await User.find({}, { username: 1 });
        const filteredUsers = users.filter(user => user.username !== currentUserId);

        res.status(200).json(filteredUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}

async function _getUserProfile(req, res) {
    try {
        const currentUserId = req.user.userId;

        const users = await User.find({}, { username: 1 });
        const userProfile = users.filter(user => user.username == currentUserId);

        res.status(200).json(userProfile);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}

async function _getAllFriends(req, res) {
    try {
        const currentUserId = req.user.userId;

        const user = await User.findOne({ username: currentUserId })
            .populate('friends', 'username email')
            .exec();


        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user.friends); // return the populated friend list
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

async function _requests(req, res){
    try {
        const currentUserId = req.user.userId;
        const currentUser = await User.findOne({ username: currentUserId })
            .populate('requestsSent', 'username')
            .populate('requestsReceived', 'username');

        res.json({
            requestsSent: currentUser.requestsSent,
            requestsReceived: currentUser.requestsReceived
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching requests' });
    }
}
const sendFriendRequest = async (req, res) => {
    const { senderUsername, receiverId } = req.body;

    try {
        const sender = await User.findOne({ username: senderUsername });
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        const senderId = sender._id.toString(); // Extract actual sender ID

        if (
            sender.requestsSent.includes(receiverId) ||
            sender.friends.includes(receiverId)
        ) {
            return res.status(400).json({ message: "Already sent or already friends" });
        }

        sender.requestsSent.push(receiverId);
        receiver.requestsReceived.push(senderId);

        await sender.save();
        await receiver.save();

        return res.json({ message: "Friend request sent" });

    } catch (err) {
        console.error("Error in sending request:", err);
        return res.status(500).json({ message: "Server error" });
    }
};




const acceptFriendRequest = async (req, res) => {
    const { userId, senderId } = req.body;

    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!user || !sender) return res.status(404).json({ message: "User not found" });

    if (!user.requestsReceived.includes(senderId)) {
        return res.status(400).json({ message: "No such request" });
    }

    // Add each other as friends
    user.friends.push(senderId);
    sender.friends.push(userId);

    // Remove from requests
    user.requestsReceived = user.requestsReceived.filter(id => id.toString() !== senderId);
    sender.requestsSent = sender.requestsSent.filter(id => id.toString() !== userId);

    await user.save();
    await sender.save();

    res.json({ message: "Friend request accepted" });
};


const cancelFriendRequest = async (req, res) => {
    const { senderId, receiverId } = req.body;

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) return res.status(404).json({ message: "User not found" });

    sender.requestsSent = sender.requestsSent.filter(id => id.toString() !== receiverId);
    receiver.requestsReceived = receiver.requestsReceived.filter(id => id.toString() !== senderId);

    await sender.save();
    await receiver.save();

    res.json({ message: "Friend request cancelled" });
};


const unfriend = async (req, res) => {
    const { userId, friendId } = req.body;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) return res.status(404).json({ message: "User not found" });

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== userId);

    await user.save();
    await friend.save();

    res.json({ message: "Unfriended successfully" });
};



async function _responds(req, res) {
    const { senderId, accepted } = req.body;

    try {
        const sender = await User.findById(senderId);       

        const receiver = await User.findOne({ username: req.user.userId });

        if (!sender || !receiver) {
            return res.status(404).json({ message: "User not found" });
        }
        const receiverId = receiver._id.toString(); // Extract actual sender ID

        // Remove from requests
        receiver.requestsReceived = receiver.requestsReceived.filter(id => id.toString() !== senderId);
        sender.requestsSent = sender.requestsSent.filter(id => id.toString() !== receiverId);

        if (accepted) {
            receiver.friends.push(senderId);
            sender.friends.push(receiverId);
        }

        await sender.save();
        await receiver.save();

        res.json({ message: accepted ? "Friend request accepted" : "Friend request rejected" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

export {
    _createUserAccount, _getAllUsers, _loginUser, sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    unfriend, _getUserProfile, _getAllFriends, _requests, _responds
}
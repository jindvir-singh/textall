import User from '../models/userAccount.js'
import { generateToken, authenticateJWT, requireAuth, logoutUser } from '../middlewares/auth.js'


async function _createUserAccount(req,res){
    const {username, email, password, gender} = req.body;

    // Check if all required fields are provided
    if(!username){
        return res.status(400).json({error: 'Username is required'});
    }else if(!email){
        return res.status(400).json({error: 'Email is required'});
    } else if(!password){
        return res.status(400).json({error: 'Password is required'});
    }else if(!gender){
        return res.status(400).json({error: 'Gender is required'});
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
   
    return res.status(201).json({message:'user created successfully'})
}


// to add password checking later
async function _loginUser(req,res){
    const {username} = req.body;

    try{
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            const token = generateToken(username);

            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'Strict' });
            return res.status(200).json({message:'user verified successfully'})
        }
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ error: 'Server error' });
    }
}

async function _getAllUsers(req, res) {
    try {
        const currentUserId = req.user.userId;

        const users = await User.find({}, { username: 1});
        const filteredUsers = users.filter(user => user.username !== currentUserId);

        res.status(200).json(filteredUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}



export {_createUserAccount, _getAllUsers, _loginUser}
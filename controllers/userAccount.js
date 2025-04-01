import { User } from '../models/userAccount.js'

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

    return res.status(201).json({message:'user created successfully'})
}

export {_createUserAccount}
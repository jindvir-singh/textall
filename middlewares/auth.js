import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';


dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

// Generate JWT token
export function generateToken(userId) {
    return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });
}

// Middleware to check authentication via JWT
export function authenticateJWT(req, res, next) {
    const token = req.cookies.jwtToken;
    
    if (!token) {
        return next(); // No token, proceed normally
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return next(); // Invalid token, proceed normally
        }
        return res.redirect('/userDashboard'); // Valid token, redirect
    });
}

// Middleware to protect routes (redirect to home if not authenticated)
export function requireAuth(req, res, next) {
    const token = req.cookies.jwtToken;
    
    if (!token) return res.redirect('/');

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.redirect('/');
        req.user = decoded; // Store user data in request
        next();
    });
}

// Logout function (clear JWT cookie)
export function logoutUser(res) {
    res.clearCookie('jwtToken');
}



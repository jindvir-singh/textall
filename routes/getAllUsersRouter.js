// routes/getAllUsersRouter.js
import express from 'express';
import { _getAllFriends, _getAllUsers, _getUserProfile, _requests, _responds } from '../controllers/userAccount.js';
import {requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/all', requireAuth, _getAllUsers);// router.get('/')
router.get('/me', requireAuth, _getUserProfile);// router.get('/')
router.get('/friends', requireAuth, _getAllFriends);// router.get('/')
router.get('/requests', requireAuth, _requests);
router.post('/respond', requireAuth, _responds);


export default router;

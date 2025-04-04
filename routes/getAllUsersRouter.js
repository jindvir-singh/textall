// routes/getAllUsersRouter.js
import express from 'express';
import { _getAllUsers } from '../controllers/userAccount.js';
import { authenticateJWT, requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/all', requireAuth, _getAllUsers);// router.get('/')
export default router;

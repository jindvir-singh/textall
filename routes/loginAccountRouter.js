// routes/loginAccountRouter.js
import express from 'express';
import { _loginUser } from '../controllers/userAccount.js';

const router = express.Router();

router.post('/', _loginUser); // POST /loginAccount

export default router;

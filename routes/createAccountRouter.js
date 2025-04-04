// routes/createAccountRouter.js
import express from 'express';
import { _createUserAccount } from '../controllers/userAccount.js';

const router = express.Router();

router.post('/', _createUserAccount); // POST /createAccount

export default router;

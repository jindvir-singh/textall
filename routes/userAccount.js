import express from 'express';
import { _createUserAccount } from '../controllers/userAccount.js';

const router = express.Router();

router.post('/', _createUserAccount);
// router.get('/')
export default router;
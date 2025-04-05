import express from "express";
import {
    sendFriendRequest,
    acceptFriendRequest
} from "../controllers/userAccount.js";

const friendsRouter = express.Router();

friendsRouter.post("/send", sendFriendRequest);
friendsRouter.post("/accept", acceptFriendRequest);


export default friendsRouter;

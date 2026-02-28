import express from 'express';
import User from '../models/user_schema.js';

export const user = express.Router();

user.get("/list", async (req, res, next) => {
    try {
        const managerType = req.actor?.managerType;
        const query = managerType === "kids" ? { type: "Kids" } : { type: "Normal" };
        const users = await User.find(query).sort({ followers: -1 });
        return res.status(200).json({
            success: true,
            data: users
        });
    } catch (e) {
        e.statusCode = 404;
        e.message = "Error while fetching users";
        return next(e);
    }
});

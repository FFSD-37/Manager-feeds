import express from 'express';
import Payment from '../models/transactions.js';

export const payment = express.Router();

payment.get("/list", async (req, res, next) => {
    try {
        const trans = await Payment.find({}).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            payments: trans
        });
    } catch (e) {
        e.statusCode = 500;
        e.message = "Internal server error";
        return next(e);
    }
});

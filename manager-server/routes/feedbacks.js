import express from 'express';
import Feedback from '../models/feedback.js';

export const feedback = express.Router();

feedback.get("/list", async (req, res, next) => {
    try {
        const fb = await Feedback.find({}).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            feedbacks: fb
        });
    } catch (e) {
        e.statusCode = 500;
        e.message = "Error fetching feedbacks";
        return next(e);
    }
});

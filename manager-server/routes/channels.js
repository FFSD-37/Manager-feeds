import express from 'express';
import Channel from '../models/channelSchema.js';

export const channel = express.Router();

channel.get("/list", async (req, res, next) => {
    try {
        const c = await Channel.find({});
        return res.status(200).json({
            success: true,
            allchannels: c
        });
    } catch (e) {
        e.statusCode = 500;
        e.message = "Error fetching channel list";
        return next(e);
    }
});

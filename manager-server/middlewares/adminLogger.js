import morgan from "morgan";
import { AdminLog } from "../models/AdminLog.js";

export const adminLogger = morgan(
    function (tokens, req, res) {
        const logData = {
            method: tokens.method(req, res),
            url: tokens.url(req, res),
            status: Number(tokens.status(req, res)),
            responseTime: Number(tokens["response-time"](req, res)),
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        };
        AdminLog.create(logData).catch(() => { });
    },
    {
        skip: (req, res) => req.method !== "POST",
    }
);
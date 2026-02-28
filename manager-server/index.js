import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";

import { ErrorHandler } from "./middlewares/Errorhandler.js";
import { requireManagerAuth } from "./middlewares/authGuard.js";
import { requireManagerTypes } from "./middlewares/managerScope.js";
import { home } from "./routes/home.js";
import { user } from "./routes/userlist.js";
import { feedback } from "./routes/feedbacks.js";
import { reports } from "./routes/reports.js";
import { channel } from "./routes/channels.js";
import { payment } from "./routes/payments.js";
import { moderation } from "./routes/moderation.js";
import { connectDB } from "./DB/Connection.js";
import { adminLogger } from "./middlewares/adminLogger.js";
import auth from "./routes/auth.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

connectDB();

app.use(adminLogger);

app.get("/healthCheck", (req, res) => {
  return res.json({
    success: true,
    msg: "manager server is healthy",
  });
});

app.use("/auth", auth);
app.use(requireManagerAuth);
app.use("/home", home);
app.use("/user", requireManagerTypes(["user", "kids"]), user);
app.use(
  "/feedback",
  requireManagerTypes(["user", "channel", "kids"]),
  feedback
);
app.use("/report", requireManagerTypes(["user", "channel", "kids"]), reports);
app.use("/channel", requireManagerTypes(["channel"]), channel);
app.use(
  "/moderation",
  requireManagerTypes(["user", "channel", "kids"]),
  moderation
);
app.use("/payment", requireManagerTypes(["revenue"]), payment);

app.use(ErrorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Manager at service at: http://localhost:${PORT}`);
});

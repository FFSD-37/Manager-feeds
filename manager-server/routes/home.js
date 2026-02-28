import express from "express";
import User from "../models/user_schema.js";
import Channel from "../models/channelSchema.js";
import Payment from "../models/transactions.js";
import ActivityLog from "../models/messages.js";
import Report from "../models/report_schema.js";
import Post from "../models/post.js";
import Story from "../models/stories.js";

export const home = express.Router();

const allowTypes = (req, next, allowed) => {
  const managerType = req.actor?.managerType;
  if (!allowed.includes(managerType)) {
    const err = new Error(
      `Access denied for manager type '${managerType || "unknown"}'`
    );
    err.statusCode = 403;
    next(err);
    return false;
  }
  return true;
};

home.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    msg: "Home page came",
  });
});

home.get("/getUsers", async (req, res, next) => {
  if (!allowTypes(req, next, ["user", "kids"])) return;
  try {
    const query =
      req.actor?.managerType === "kids" ? { type: "Kids" } : { type: "Normal" };
    const users = await User.find(query).sort({ followers: -1 }).limit(4);
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (e) {
    e.statusCode = 404;
    e.message = "Error while fetching users";
    return next(e);
  }
});

home.get("/getChannels", async (req, res, next) => {
  if (!allowTypes(req, next, ["channel"])) return;
  try {
    const channels = await Channel.find({}).sort({ followers: -1 }).limit(5);
    return res.status(200).json({
      success: true,
      data: channels,
    });
  } catch (e) {
    e.statusCode = 404;
    e.message = "Error while fetching channels";
    return next(e);
  }
});

home.get("/getRevenue", async (req, res, next) => {
  if (!allowTypes(req, next, ["revenue"])) return;
  try {
    const trans = await Payment.find({});
    let total = 0;

    trans.forEach((ele) => {
      if (ele.status === "Completed") {
        total += Number(ele.amount);
      }
    });

    return res.status(200).json({
      success: true,
      rev: total,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching total revenue";
    return next(e);
  }
});

home.get("/getUserCount", async (req, res, next) => {
  if (!allowTypes(req, next, ["user", "kids", "channel"])) return;
  try {
    const usersQuery =
      req.actor?.managerType === "kids" ? { type: "Kids" } : { type: "Normal" };
    const users = await User.find(usersQuery);
    const channels =
      req.actor?.managerType === "channel" ? await Channel.find({}) : [];
    return res.status(200).json({
      success: true,
      count: users.length + channels.length,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching total users";
    return next(e);
  }
});

home.get("/getReach", async (req, res, next) => {
  if (!allowTypes(req, next, ["user", "channel", "kids"])) return;
  try {
    const data = await ActivityLog.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    const count = await ActivityLog.find({});

    return res.status(200).json({
      success: true,
      data,
      count: count.length,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Internal server error";
    return next(e);
  }
});

home.get("/reportData", async (req, res, next) => {
  if (!allowTypes(req, next, ["user", "channel", "kids"])) return;
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await Report.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          pending: [{ $match: { status: "Pending" } }, { $count: "count" }],
          resolvedToday: [
            {
              $match: {
                status: "Resolved",
                updatedAt: { $gte: startOfDay, $lt: endOfDay },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    const data = {
      total: stats[0].total[0]?.count || 0,
      pending: stats[0].pending[0]?.count || 0,
      resolvedToday: stats[0].resolvedToday[0]?.count || 0,
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Internal server error";
    return next(e);
  }
});

home.get("/contentActivityToday", async (req, res, next) => {
  if (!allowTypes(req, next, ["user", "channel", "kids"])) return;
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [postsToday, reelsToday, storiesToday] = await Promise.all([
      Post.countDocuments({
        type: "Img",
        createdAt: { $gte: startOfDay, $lt: endOfDay },
        isArchived: false,
        ispublic: true,
      }),
      Post.countDocuments({
        type: "Reels",
        createdAt: { $gte: startOfDay, $lt: endOfDay },
        isArchived: false,
        ispublic: true,
      }),
      Story.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        postsToday,
        reelsToday,
        storiesToday,
      },
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Internal server error";
    return next(e);
  }
});

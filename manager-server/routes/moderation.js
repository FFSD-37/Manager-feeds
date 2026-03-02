import express from "express";
import Post from "../models/post.js";
import User from "../models/user_schema.js";
import Channel from "../models/channelSchema.js";
import Report from "../models/report_schema.js";
import ManagerAction from "../models/managerAction.js";

export const moderation = express.Router();

// Get comprehensive user details for manager
moderation.get("/user/:username", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const { username } = req.params;

    let user, userType;
    
    // Try to find as regular/kids user
    const foundUser = await User.findOne({ username }).select(
      "username fullName email phone profilePicture bio type followers followings blockedUsers isPremium coins visibility dob gender createdAt"
    );
    
    if (foundUser) {
      userType = foundUser.type;
      // Check if manager can access this user
      if (managerType === "kids" && userType !== "Kids") {
        const err = new Error("Access denied");
        err.statusCode = 403;
        return next(err);
      }
      if (managerType === "user" && userType === "Kids") {
        const err = new Error("Access denied");
        err.statusCode = 403;
        return next(err);
      }
      user = foundUser.toObject();
    }

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        followersCount: user.followers?.length || 0,
        followingsCount: user.followings?.length || 0,
      },
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching user details";
    return next(e);
  }
});

// Get user's posts
moderation.get("/user/:username/posts", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const { username } = req.params;

    const user = await User.findOne({ username }).select("type");
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    if (managerType === "kids" && user.type !== "Kids") {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }
    if (managerType === "user" && user.type === "Kids") {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    const posts = await Post.find({ author: username })
      .select("id type content url likes dislikes isArchived warnings createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      posts: posts || [],
      count: posts.length,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching user posts";
    return next(e);
  }
});

// Get user's reports
moderation.get("/user/:username/reports", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const { username } = req.params;

    const user = await User.findOne({ username }).select("type");
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    const reportedByUser = await Report.find({ reporter: username }).sort({ createdAt: -1 });
    const reportsAgainstUser = await Report.find({ user_reported: username }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      reportedByUser: reportedByUser || [],
      reportsAgainstUser: reportsAgainstUser || [],
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching user reports";
    return next(e);
  }
});

// Delete user post
moderation.delete("/post/:id", async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const post = await Post.findById(req.params.id);

    if (!post) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      return next(err);
    }

    post.isArchived = true;
    post.content = reason
      ? `[Removed by manager: ${reason}] ${post.content || ""}`.trim()
      : `[Removed by manager] ${post.content || ""}`.trim();
    await post.save();

    await ManagerAction.create({
      managerId: req.actor._id,
      managerUsername: req.actor.username,
      managerType: req.actor.managerType,
      actionType: "post_removed",
      postId: post.id,
      notes: reason || "",
    });

    return res.status(200).json({
      success: true,
      msg: "Post removed by manager",
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error removing post";
    return next(e);
  }
});

// Warn user
moderation.post("/user/:username/warn", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const { username } = req.params;
    const { reason } = req.body || {};

    const user = await User.findOne({ username });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    if (managerType === "kids" && user.type !== "Kids") {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    await ManagerAction.create({
      managerId: req.actor._id,
      managerUsername: req.actor.username,
      managerType: req.actor.managerType,
      actionType: "user_warned",
      targetUser: username,
      notes: reason || "User warned for violating community guidelines",
    });

    return res.status(200).json({
      success: true,
      msg: `User ${username} has been warned`,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error warning user";
    return next(e);
  }
});

// Ban/suspend user
moderation.post("/user/:username/ban", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const { username } = req.params;
    const { reason, duration } = req.body || {};

    const user = await User.findOne({ username });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    if (managerType === "kids" && user.type !== "Kids") {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    // Mark user as banned (would need to add isBanned field to User schema)
    user.isBanned = true;
    user.banReason = reason || "Violation of community guidelines";
    user.bannedAt = new Date();
    await user.save();

    await ManagerAction.create({
      managerId: req.actor._id,
      managerUsername: req.actor.username,
      managerType: req.actor.managerType,
      actionType: "user_banned",
      targetUser: username,
      notes: reason || "User banned",
      duration: duration || null,
    });

    return res.status(200).json({
      success: true,
      msg: `User ${username} has been banned`,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error banning user";
    return next(e);
  }
});

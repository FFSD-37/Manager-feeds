import express from "express";
import Post from "../models/post.js";
import ManagerAction from "../models/managerAction.js";

export const moderation = express.Router();

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

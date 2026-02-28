import express from "express";
import Post from "../models/post.js";

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

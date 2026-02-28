import dotenv from "dotenv";
dotenv.config();
import express from "express";
import Report from "../models/report_schema.js";
import User from "../models/user_schema.js";
import Channel from "../models/channelSchema.js";
import Post from "../models/post.js";
import ManagerAction from "../models/managerAction.js";
import { transporter } from "../utils/mailer.js";

export const reports = express.Router();

async function classifyReport(report) {
  if (report.post_id === "On account") {
    return "user";
  }

  const post = await Post.findOne({ id: report.post_id }).select("id author type url content");
  if (!post) {
    return null;
  }

  const [user, channel] = await Promise.all([
    User.findOne({ username: post.author }).select("type username"),
    Channel.findOne({ channelName: post.author }).select("channelName"),
  ]);

  let scopeType = null;
  if (channel) {
    scopeType = "channel";
  } else if (user?.type === "Kids") {
    scopeType = "kids";
  } else if (user) {
    scopeType = "user";
  }

  return {
    scopeType,
    post,
  };
}

function canManagerHandle(scopeType, managerType) {
  if (!scopeType || !managerType) return false;
  return scopeType === managerType;
}

reports.get("/list", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const allReports = await Report.find({}).sort({ createdAt: -1 });

    const filtered = [];
    for (const report of allReports) {
      const classified = await classifyReport(report);
      const scopeType =
        report.post_id === "On account" ? "user" : classified?.scopeType || null;

      if (canManagerHandle(scopeType, managerType)) {
        filtered.push({
          ...report.toObject(),
          scopeType,
          postPreview:
            report.post_id === "On account"
              ? null
              : {
                  id: classified?.post?.id || null,
                  author: classified?.post?.author || null,
                  type: classified?.post?.type || null,
                  url: classified?.post?.url || null,
                  content: classified?.post?.content || null,
                },
        });
      }
    }

    return res.status(200).json({
      success: true,
      reports: filtered,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Internal server error";
    return next(e);
  }
});

reports.get("/:id/details", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    const report = await Report.findById(req.params.id);

    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      return next(err);
    }

    const classified = await classifyReport(report);
    const scopeType = report.post_id === "On account" ? "user" : classified?.scopeType || null;

    if (!canManagerHandle(scopeType, managerType)) {
      const err = new Error("Access denied for this report");
      err.statusCode = 403;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      report: {
        ...report.toObject(),
        scopeType,
      },
      post:
        report.post_id === "On account"
          ? null
          : {
              id: classified?.post?.id || null,
              author: classified?.post?.author || null,
              type: classified?.post?.type || null,
              url: classified?.post?.url || null,
              content: classified?.post?.content || null,
            },
    });
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message = e.message || "Error fetching report details";
    return next(e);
  }
});

reports.post("/updateReportStatus", async (req, res, next) => {
  try {
    const { reportId, status } = req.body;
    const managerType = req.actor?.managerType;

    const report = await Report.findById(reportId);
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      return next(err);
    }

    const classified = await classifyReport(report);
    const scopeType = report.post_id === "On account" ? "user" : classified?.scopeType || null;

    if (!canManagerHandle(scopeType, managerType)) {
      const err = new Error("Access denied for this report");
      err.statusCode = 403;
      return next(err);
    }

    const oldStatus = report.status;

    if (oldStatus === status) {
      return res.status(200).json({
        success: true,
        msg: "Status is already the same",
      });
    }

    report.status = status;
    await report.save();

    await ManagerAction.create({
      managerId: req.actor._id,
      managerUsername: req.actor.username,
      managerType: req.actor.managerType,
      actionType: status === "Resolved" ? "report_resolved" : "report_status_changed",
      reportId: report._id,
      postId: report.post_id,
      statusFrom: oldStatus,
      statusTo: status,
      notes: report.reason || "",
    });

    const user = await User.findOne({ username: report.user_reported });

    if (user && user.email) {
      await transporter.sendMail({
        from: `"Admin" <${process.env.MAIL_USER || process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Report Status Updated",
        html: `
          <p>Hello ${user.username},</p>
          <p>Your report (<b>#${report.report_number}</b>) status has been updated.</p>
          <p><b>Old Status:</b> ${oldStatus}</p>
          <p><b>New Status:</b> ${status}</p>
          <br />
          <p>Thank you for helping us keep the community safe.</p>
        `,
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Status updated successfully",
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error while updating status of the report";
    return next(e);
  }
});

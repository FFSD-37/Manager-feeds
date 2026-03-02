import dotenv from "dotenv";
dotenv.config();
import express from "express";
import Report from "../models/report_schema.js";
import User from "../models/user_schema.js";
import Post from "../models/post.js";
import ManagerAction from "../models/managerAction.js";
import { transporter } from "../utils/mailer.js";

export const reports = express.Router();

const canManagerHandleReports = (managerType) => managerType === "posts";
const POSTS_MANAGER_REPORT_IDS = [3, 4, 5, 6];

const getScopeFromReportId = (reportId) => {
  if (reportId === 3) return "normal_or_kids_post";
  if (reportId === 4) return "channel_post";
  if (reportId === 5) return "normal_chat";
  if (reportId === 6) return "channel_chat";
  if (reportId === 1) return "normal_or_kids_account";
  if (reportId === 2) return "channel_account";
  return "unknown";
};

reports.get("/list", async (req, res, next) => {
  try {
    const managerType = req.actor?.managerType;
    if (!canManagerHandleReports(managerType)) {
      const err = new Error("Access denied for this module");
      err.statusCode = 403;
      return next(err);
    }

    const allReports = await Report.find({
      report_id: { $in: POSTS_MANAGER_REPORT_IDS },
    }).sort({ createdAt: -1 });

    const reportsWithPreview = await Promise.all(
      allReports.map(async (report) => {
        if (report.post_id === "On account") {
          return {
            ...report.toObject(),
            scopeType: getScopeFromReportId(report.report_id),
            postPreview: null,
          };
        }

        const post = await Post.findOne({ id: report.post_id }).select(
          "id author type url content"
        );

        return {
          ...report.toObject(),
          scopeType: getScopeFromReportId(report.report_id),
          postPreview: post
            ? {
                id: post.id,
                author: post.author,
                type: post.type,
                url: post.url,
                content: post.content,
              }
            : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      reports: reportsWithPreview,
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
    if (!canManagerHandleReports(managerType)) {
      const err = new Error("Access denied for this module");
      err.statusCode = 403;
      return next(err);
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      return next(err);
    }

    if (!POSTS_MANAGER_REPORT_IDS.includes(report.report_id)) {
      const err = new Error("Access denied for this report");
      err.statusCode = 403;
      return next(err);
    }

    const post =
      report.post_id === "On account"
        ? null
        : await Post.findOne({ id: report.post_id }).select(
            "id author type url content"
          );

    return res.status(200).json({
      success: true,
      report: {
        ...report.toObject(),
        scopeType: getScopeFromReportId(report.report_id),
      },
      post,
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

    if (!canManagerHandleReports(managerType)) {
      const err = new Error("Access denied for this module");
      err.statusCode = 403;
      return next(err);
    }

    const report = await Report.findById(reportId);
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      return next(err);
    }

    if (!POSTS_MANAGER_REPORT_IDS.includes(report.report_id)) {
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

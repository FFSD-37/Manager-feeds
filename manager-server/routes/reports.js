import dotenv from "dotenv";
dotenv.config();
import express from "express";
import Report from "../models/report_schema.js";
import User from "../models/user_schema.js";
import Post from "../models/post.js";
import ManagerAction from "../models/managerAction.js";
import { transporter } from "../utils/mailer.js";

export const reports = express.Router();

// determines which manager types may access reports at all
// posts managers handle post-related reports (ids 3-6)
// user managers will handle account-related reports (ids 1-2)
const canManagerHandleReports = (managerType) => {
  return managerType === "posts" || managerType === "users";
};

const POSTS_MANAGER_REPORT_IDS = [3, 4, 5, 6];
const ACCOUNT_REPORT_IDS = [1, 2];

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
    console.log("Manager type:", managerType);
    if (!canManagerHandleReports(managerType)) {
      const err = new Error("Access denied for this module");
      err.statusCode = 403;
      return next(err);
    }

    let filterIds = [];
    if (managerType === "posts") {
      filterIds = POSTS_MANAGER_REPORT_IDS;
    } else if (managerType === "users") {
      filterIds = ACCOUNT_REPORT_IDS;
    }

    const allReports = await Report.find({
      report_number: { $in: filterIds },
    }).sort({ createdAt: -1 });

    console.log(`Fetched ${allReports.length} reports for manager type: ${managerType}`);

    const reportsWithPreview = await Promise.all(
      allReports.map(async (report) => {
        // for account-level reports we don't have a post preview, but we may
      // optionally provide the reported account's basic info in the list
      if (ACCOUNT_REPORT_IDS.includes(report.report_id)) {
        return {
          ...report.toObject(),
          scopeType: getScopeFromReportId(report.report_id),
          postPreview: null,
        };
      }

      // otherwise it's a post-level report
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

    // limit which reports the manager may view based on their type
    if (
      (managerType === "posts" && !POSTS_MANAGER_REPORT_IDS.includes(report.report_id)) ||
      (managerType === "users" && !ACCOUNT_REPORT_IDS.includes(report.report_id))
    ) {
      const err = new Error("Access denied for this report");
      err.statusCode = 403;
      return next(err);
    }

    // prepare response payload
    const resp = {
      success: true,
      report: {
        ...report.toObject(),
        scopeType: getScopeFromReportId(report.report_id),
      },
    };

    // if the report is about a post, include post details
    if (!ACCOUNT_REPORT_IDS.includes(report.report_id)) {
      const post = await Post.findOne({ id: report.post_id }).select(
        "id author type url content"
      );
      resp.post = post;
    }

    // if a user manager requests an account report, include account and recent posts
    if (
      managerType === "users" &&
      ACCOUNT_REPORT_IDS.includes(report.report_id)
    ) {
      if (report.report_id === 1) {
        // normal/kids account
        const account = await User.findOne({
          username: report.user_reported,
        }).select("-password");
        const accountPosts = await Post.find({
          author: report.user_reported,
        })
          .sort({ createdAt: -1 })
          .limit(50);
        resp.account = account;
        resp.accountPosts = accountPosts;
      } else if (report.report_id === 2) {
        // channel account
        const account = await Channel.findOne({
          channelName: report.user_reported,
        });
        const accountPosts = await Post.find({
          author: report.user_reported,
        })
          .sort({ createdAt: -1 })
          .limit(50);
        resp.account = account;
        resp.accountPosts = accountPosts;
      }
    }

    return res.status(200).json(resp);
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
    console.log("Manager type:", managerType);
    console.log("Updating report status:", { reportId, status });

    if (!canManagerHandleReports(managerType)) {
      const err = new Error("Access denied for this module");
      err.statusCode = 403;
      return next(err);
    }

    const report = await Report.findById(reportId);
    console.log(report)
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      return next(err);
    }

    if (!POSTS_MANAGER_REPORT_IDS.includes(report.report_number)) {
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
    console.log(e);
    e.statusCode = 500;
    e.message = "Error while updating status of the report";
    return next(e);
  }
});

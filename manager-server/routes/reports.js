import dotenv from "dotenv";
dotenv.config();
import express from "express";
import Report from "../models/report_schema.js";
import User from "../models/user_schema.js";
import { transporter } from "../utils/mailer.js";

export const reports = express.Router();

reports.get("/list", async (req, res, next) => {
  try {
    const re = await Report.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      reports: re,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Internal server error";
    return next(e);
  }
});

reports.post("/updateReportStatus", async (req, res, next) => {
  try {
    const { reportId, status } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
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

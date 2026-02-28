import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    method: String,
    url: String,
    status: Number,
    responseTime: Number,
    ip: String,
    userAgent: String,
  },
  { timestamps: true, collection: "admin-logs" }
);

export const AdminLog = mongoose.model("AdminLog", adminLogSchema);

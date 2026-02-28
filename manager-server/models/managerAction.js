import mongoose from "mongoose";

const managerActionSchema = new mongoose.Schema(
  {
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    managerUsername: {
      type: String,
      required: true,
    },
    managerType: {
      type: String,
      enum: ["user", "channel", "kids", "revenue"],
      required: true,
    },
    actionType: {
      type: String,
      enum: ["report_status_changed", "report_resolved", "post_removed"],
      required: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      default: null,
    },
    postId: {
      type: String,
      default: null,
    },
    statusFrom: {
      type: String,
      default: null,
    },
    statusTo: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const ManagerAction = mongoose.model("ManagerAction", managerActionSchema);

export default ManagerAction;

import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  post_id: {
    type: String,
    required: true
  },
  report_number: {
    type: Number,
    default: 0
  },
  user_reported: {
    type: String
  },
  status: {
    type: String,
    default: "Pending"
  },
  reason: {
    type: String
  }
}, {timestamps: true});

const Report = mongoose.model('Report', reportSchema);

export default Report;
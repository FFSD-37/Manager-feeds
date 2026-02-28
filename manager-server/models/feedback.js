import mongoose from "mongoose";

const feedbackFormSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name:{
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
}, {timestamps: true});

const Feedback = mongoose.model('Feedback', feedbackFormSchema);

export default Feedback;
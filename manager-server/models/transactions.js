import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  status:{
    type: String,
    required: true
  },
  reference_id: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  }
}, {timestamps: true});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
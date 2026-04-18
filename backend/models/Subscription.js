import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user_id: { type: String, ref: 'User', required: true, index: true },
  plan_name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  razorpay_payment_id: String,
  razorpay_order_id: String,
  razorpay_signature: String,
  status: { type: String, default: 'active' },
  purchased_at: { type: Date, default: Date.now },
  expires_at: Date,
});

export default mongoose.model('Subscription', subscriptionSchema);

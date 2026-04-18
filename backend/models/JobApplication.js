import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
  mission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mission', index: true },
  user_id: { type: String, ref: 'User', required: true, index: true },
  job_title: String,
  company: String,
  location: String,
  match_score: Number,
  source: String,
  salary: String,
  apply_url: String,
  status: { type: String, default: 'applied' },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('JobApplication', jobApplicationSchema);

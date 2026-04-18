import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  user_id: { type: String, ref: 'User', required: true, index: true },
  target_role: String,
  template_id: String,
  file_format: String,
  resume_data: mongoose.Schema.Types.Mixed,
  ats_score: Number,
  skills_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Resume', resumeSchema);

import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema({
  user_id: { type: String, ref: 'User', required: true, index: true },
  target_role: { type: String, required: true },
  location: String,
  experience: String,
  skills: String,
  salary: String,
  work_mode: String,
  notice_period: String,
  jobs_found: { type: Number, default: 0 },
  status: { type: String, default: 'completed' },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Mission', missionSchema);

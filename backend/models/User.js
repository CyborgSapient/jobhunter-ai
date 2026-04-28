import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: { type: String }, // Clerk user ID (e.g. "user_2x...")
    email: { type: String, unique: true, sparse: true },
    username: { type: String, unique: true, sparse: true },
    name: String,
    image_url: String,
    phone: String,
    location: String,
    current_role: String,
    target_role: String,
    experience: String,
    skills: String,
    linkedin: String,
    github: String,
    portfolio: String,
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model('User', userSchema);

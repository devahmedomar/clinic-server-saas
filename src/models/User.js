import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', default: null },
    role: { type: String, enum: ['owner', 'clinicAdmin', 'doctor', 'receptionist'], required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String },
    inviteToken: { type: String, default: null },
    status: { type: String, enum: ['active', 'invited'], default: 'active' },
  },
  { timestamps: true },
);

userSchema.index({ clinicId: 1, role: 1 });
userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);
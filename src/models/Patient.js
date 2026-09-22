import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', ''], default: '' },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

patientSchema.index({ clinicId: 1, createdAt: -1 });
patientSchema.index({ clinicId: 1, name: 1 });
patientSchema.index({ clinicId: 1, phone: 1 });

export default mongoose.model('Patient', patientSchema);
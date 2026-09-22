import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'gracePeriod', 'locked', 'cancelled'],
      default: 'trial',
    },
    trialEndsAt: { type: Date, required: true },
    nextDueDate: { type: Date },
    graceEndsAt: { type: Date },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settings: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

clinicSchema.index({ subscriptionStatus: 1, createdAt: -1 });

export default mongoose.model('Clinic', clinicSchema);
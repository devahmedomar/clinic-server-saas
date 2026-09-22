import mongoose from 'mongoose';

const subscriptionEventSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    type: {
      type: String,
      enum: ['trial_start', 'manual_payment', 'suspend', 'reactivate', 'cancel'],
      required: true,
    },
    amount: { type: Number, default: 0 },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

subscriptionEventSchema.index({ clinicId: 1, createdAt: -1 });

export default mongoose.model('SubscriptionEvent', subscriptionEventSchema);
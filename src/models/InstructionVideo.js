import mongoose from 'mongoose';

const instructionVideoSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    youtubeId: { type: String, required: true },
    url: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

instructionVideoSchema.index({ clinicId: 1, createdAt: -1 });

export default mongoose.model('InstructionVideo', instructionVideoSchema);
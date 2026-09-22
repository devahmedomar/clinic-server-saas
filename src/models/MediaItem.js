import mongoose from 'mongoose';

const mediaItemSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    visitNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitNote' },
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, default: '' }, // external URL — no binary bytes stored in Mongo
    youtubeId: { type: String, default: '' },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

mediaItemSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
mediaItemSchema.index({ clinicId: 1, visitNoteId: 1 });

export default mongoose.model('MediaItem', mediaItemSchema);
import mongoose from 'mongoose';

const visitNoteSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    diagnosis: { type: String, default: '' },
    prescription: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

visitNoteSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });

export default mongoose.model('VisitNote', visitNoteSchema);
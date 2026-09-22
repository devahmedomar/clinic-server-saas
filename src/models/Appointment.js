import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startsAt: { type: String, required: true }, // HH:mm
    durationMin: { type: Number, default: 20 },
    status: {
      type: String,
      enum: ['booked', 'done', 'cancelled', 'no-show'],
      default: 'booked',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

appointmentSchema.index({ clinicId: 1, date: 1, doctorId: 1 });
appointmentSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });

export default mongoose.model('Appointment', appointmentSchema);
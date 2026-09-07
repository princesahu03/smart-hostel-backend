import mongoose from 'mongoose'

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    required: true
  },
  // Receipt — S3 URL:
  receipt: {
    type: String,
    default: null
  }
}, { timestamps: true })

export const Fee = mongoose.model(
  'Fee', feeSchema
)
import mongoose from 'mongoose'

const visitorSchema = new mongoose.Schema({
  // Student who requested:
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Visitor details:
  visitorName: {
    type: String,
    required: true,
    trim: true
  },
  visitorPhone: {
    type: String,
    required: true
  },
  relation: {
    type: String,
    enum: [
      'parent',
      'sibling',
      'relative',
      'friend',
      'guardian',
      'other'
    ],
    required: true
  },
  purpose: {
    type: String,
    required: true
  },

  // ID Proof — S3 URL:
  idProof: {
    type: String,
    default: null
  },

  // Visit timing:
  visitDate: {
    type: Date,
    required: true
  },
  expectedTime: {
    type: String,
    required: true
  },

  // Approval:
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'rejected',
      'checked_in',
      'checked_out'
    ],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },

  // OTP System:
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },

  // Entry/Exit tracking:
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },

  // Duration (minutes):
  duration: {
    type: Number,
    default: null
  }
}, { timestamps: true })

export const Visitor = mongoose.model(
  'Visitor', visitorSchema
)
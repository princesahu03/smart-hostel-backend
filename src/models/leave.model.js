import mongoose from 'mongoose'

const leaveSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Leave dates:
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },

  // Reason:
  reason: {
    type: String,
    required: true
  },

  // Destination:
  destination: {
    type: String,
    required: true
  },

  // Parent contact:
  parentPhone: {
    type: String,
    required: true
  },

  // Status:
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'rejected',
      'returned'
    ],
    default: 'pending'
  },

  // Admin remarks:
  remarks: {
    type: String,
    default: null
  },

  // Actual return time:
  actualReturnTime: {
    type: Date,
    default: null
  },

  // Approved by:
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true })

export const Leave = mongoose.model(
  'Leave', leaveSchema
)
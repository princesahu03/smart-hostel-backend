import mongoose from 'mongoose'

const curfewViolationSchema =
  new mongoose.Schema({
  // Student:
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Entry time:
  entryTime: {
    type: Date,
    required: true
  },

  // Curfew time that day:
  curfewTime: {
    type: String,
    required: true
  },

  // Minutes late:
  minutesLate: {
    type: Number,
    required: true
  },

  // Day type:
  dayType: {
    type: String,
    enum: ['weekday', 'weekend'],
    required: true
  },

  // QR Entry reference:
  qrEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QREntry',
    default: null
  },

  // Warning level:
  warningLevel: {
    type: Number,
    default: 1
    // 1 = Warning, 2 = Notice,
    // 3 = Action
  },

  // Parent notified:
  parentNotified: {
    type: Boolean,
    default: false
  },

  parentNotifiedAt: {
    type: Date,
    default: null
  },

  // Admin action:
  actionTaken: {
    type: String,
    default: null
  },

  actionTakenAt: {
    type: Date,
    default: null
  },

  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Remarks:
  remarks: {
    type: String,
    default: null
  },

  // Status:
  status: {
    type: String,
    enum: ['pending', 'warned',
      'actioned', 'excused'],
    default: 'pending'
  }
}, { timestamps: true })

export const CurfewViolation =
  mongoose.model(
    'CurfewViolation',
    curfewViolationSchema
  )
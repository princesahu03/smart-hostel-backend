import mongoose from 'mongoose'

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'general',
      'urgent',
      'event',
      'maintenance',
      'holiday'
    ],
    default: 'general'
  },
  // Who can see:
  targetRole: {
    type: String,
    enum: [
      'all',
      'student',
      'staff',
      'security'
    ],
    default: 'all'
  },
  // Posted by admin:
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Expiry date:
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

export const Notice = mongoose.model(
  'Notice', noticeSchema
)
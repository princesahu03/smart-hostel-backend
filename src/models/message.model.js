import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  // Sender:
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Receiver:
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Message content:
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // Message type:
  type: {
    type: String,
    enum: [
      'text',
      'announcement',
      'emergency'
    ],
    default: 'text'
  },

  // Read status:
  isRead: {
    type: Boolean,
    default: false
  },

  readAt: {
    type: Date,
    default: null
  },

  // For announcements:
  isAnnouncement: {
    type: Boolean,
    default: false
  },

  // Target role for announcements:
  targetRole: {
    type: String,
    enum: ['all', 'student', 'staff', 'security'],
    default: null
  },

  // Deleted by:
  deletedBySender: {
    type: Boolean,
    default: false
  },

  deletedByReceiver: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

export const Message = mongoose.model(
  'Message', messageSchema
)
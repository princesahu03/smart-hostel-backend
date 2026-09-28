import mongoose from 'mongoose'

const roomRequestSchema =
  new mongoose.Schema({
  // Student:
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Request type:
  requestType: {
    type: String,
    enum: [
      'room_change',
      'roommate_preference',
      'room_checkout',
      'room_swap'
    ],
    required: true
  },

  // Current room:
  currentRoom: {
    type: String,
    default: null
  },

  // Preferred room (for room change):
  preferredRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  },

  preferredRoomNumber: {
    type: String,
    default: null
  },

  // Roommate preference:
  preferredRoommate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Reason:
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },

  // For room_checkout:
  checkoutDate: {
    type: Date,
    default: null
  },

  // Swap with student:
  swapWithStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  swapWithRoom: {
    type: String,
    default: null
  },

  // Status:
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'rejected',
      'completed',
      'cancelled'
    ],
    default: 'pending'
  },

  // Admin response:
  adminRemarks: {
    type: String,
    default: null
  },

  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  processedAt: {
    type: Date,
    default: null
  },

  // Priority:
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { timestamps: true })

export const RoomRequest =
  mongoose.model(
    'RoomRequest',
    roomRequestSchema
  )
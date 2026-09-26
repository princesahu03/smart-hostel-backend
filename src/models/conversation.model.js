import mongoose from 'mongoose'

const conversationSchema =
  new mongoose.Schema({
  // Two participants:
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Last message:
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  lastMessageAt: {
    type: Date,
    default: Date.now
  },

  // Unread count per participant:
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true })

export const Conversation =
  mongoose.model(
    'Conversation',
    conversationSchema
  )
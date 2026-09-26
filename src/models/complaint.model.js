import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema({
  // Student who raised:
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Room reference:
  roomNumber: {
    type: String,
    default: null
  },

  // Complaint details:
  category: {
    type: String,
    enum: [
      'maintenance',
      'plumbing',
      'internet',
      'cleanliness',
      'mess',
      'security',
      'electricity',
      'other'
    ],
    required: true
  },

  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Photo evidence (S3):
  photo: {
    type: String,
    default: null
  },

  // Priority:
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // Status:
  status: {
    type: String,
    enum: [
      'pending',
      'assigned',
      'in_progress',
      'resolved',
      'rejected',
      'reopened'
    ],
    default: 'pending'
  },

  // Auto assigned staff:
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  assignedAt: {
    type: Date,
    default: null
  },

  // Resolution:
  resolvedAt: {
    type: Date,
    default: null
  },

  resolutionPhoto: {
    type: String,
    default: null
  },

  remarks: {
    type: String,
    default: null
  },

  // Student confirmation:
  studentConfirmed: {
    type: Boolean,
    default: null
    // null = not confirmed yet
    // true = confirmed resolved
    // false = rejected resolution
  },

  studentFeedback: {
    type: String,
    default: null
  },

  // Staff rating by student:
  staffRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  // Status history:
  statusHistory: [{
    status: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    remark: String,
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Escalation:
  isEscalated: {
    type: Boolean,
    default: false
  },

  escalatedAt: {
    type: Date,
    default: null
  },

  // 48hr deadline:
  deadline: {
    type: Date,
    default: null
  },

  // Rejection reason:
  rejectionReason: {
    type: String,
    default: null
  }

}, { timestamps: true })

export const Complaint = mongoose.model(
  'Complaint', complaintSchema
)
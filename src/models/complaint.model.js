import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema({
  // Who raised:
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
      'other'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },

  // Photo — S3 URL:
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

  // Status tracking:
  status: {
    type: String,
    enum: [
      'pending',
      'in_progress',
      'resolved',
      'rejected'
    ],
    default: 'pending'
  },

  // Assigned staff:
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Resolution:
  remarks: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
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
  }]
}, { timestamps: true })

export const Complaint = mongoose.model(
  'Complaint', complaintSchema
)
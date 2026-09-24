import mongoose from 'mongoose'

const qrEntrySchema = new mongoose.Schema({
  // Student reference:
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Entry type:
  type: {
    type: String,
    enum: [
      'entry',      // Hostel mein aaya
      'exit',       // Hostel se gaya
      'meal'        // Khana khaya
    ],
    required: true
  },

  // Meal type (if type === 'meal'):
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    default: null
  },

  // Timestamp:
  scanTime: {
    type: Date,
    default: Date.now
  },

  // Gate location:
  location: {
    type: String,
    default: 'Main Gate'
  },

  // Late entry flag:
  isLate: {
    type: Boolean,
    default: false
  },

  // Curfew time at scan:
  curfewTime: {
    type: String,
    default: '22:00'
  },

  // Scanned by:
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Notes:
  notes: {
    type: String,
    default: null
  }
}, { timestamps: true })

export const QREntry = mongoose.model(
  'QREntry', qrEntrySchema
)
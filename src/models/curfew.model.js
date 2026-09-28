import mongoose from 'mongoose'

const curfewSchema = new mongoose.Schema({
  // Curfew time settings:
  weekdayTime: {
    type: String,
    default: '22:00'
    // 10:00 PM weekdays
  },

  weekendTime: {
    type: String,
    default: '23:00'
    // 11:00 PM weekends
  },

  // Grace period in minutes:
  gracePeriod: {
    type: Number,
    default: 15
    // 15 min after curfew ok
  },

  // Active:
  isActive: {
    type: Boolean,
    default: true
  },

  // Parent alert after violations:
  parentAlertAfter: {
    type: Number,
    default: 3
    // Alert after 3 violations
  },

  // Strict mode:
  strictMode: {
    type: Boolean,
    default: false
    // If true — no entry after curfew
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true })

export const Curfew = mongoose.model(
  'Curfew', curfewSchema
)
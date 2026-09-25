import mongoose from 'mongoose'

const feeRateSchema = new mongoose.Schema({
  // Room type rates:
  acSingleRoom: {
    type: Number,
    default: 8000
  },
  acDoubleRoom: {
    type: Number,
    default: 6000
  },
  acTripleRoom: {
    type: Number,
    default: 5000
  },
  nonAcSingleRoom: {
    type: Number,
    default: 5000
  },
  nonAcDoubleRoom: {
    type: Number,
    default: 4000
  },
  nonAcTripleRoom: {
    type: Number,
    default: 3000
  },

  // Additional fees:
  messFee: {
    type: Number,
    default: 3000
  },
  maintenanceFee: {
    type: Number,
    default: 500
  },
  securityDeposit: {
    type: Number,
    default: 5000
  },

  // Late fee per day:
  lateFeePerDay: {
    type: Number,
    default: 50
  },

  // Due date (day of month):
  dueDateDay: {
    type: Number,
    default: 10
    // Fee due on 10th of each month
  },

  // Grace period (days):
  gracePeriodDays: {
    type: Number,
    default: 5
  },

  // Active:
  isActive: {
    type: Boolean,
    default: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true })

export const FeeRate = mongoose.model(
  'FeeRate', feeRateSchema
)
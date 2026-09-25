import mongoose from 'mongoose'

const mealLeaveSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Leave dates:
  fromDate: {
    type: Date,
    required: true
  },

  toDate: {
    type: Date,
    required: true
  },

  // Which meals to skip:
  skipMeals: [{
    type: String,
    enum: ['breakfast', 'lunch', 'dinner']
  }],

  reason: {
    type: String,
    default: null
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
    // Auto approved for meal leave
  }
}, { timestamps: true })

export const MealLeave = mongoose.model(
  'MealLeave', mealLeaveSchema
)
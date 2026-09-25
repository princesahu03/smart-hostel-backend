import mongoose from 'mongoose'

const mealFeedbackSchema =
  new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Meal details:
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  // Rating 1-5:
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },

  // Category ratings:
  tasteRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  qualityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  quantityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  // Comment:
  comment: {
    type: String,
    default: null,
    maxlength: 500
  },

  // Leave meal:
  isLeave: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// One feedback per meal per day:
mealFeedbackSchema.index({
  student: 1,
  mealType: 1,
  date: 1
}, { unique: true })

export const MealFeedback =
  mongoose.model(
    'MealFeedback',
    mealFeedbackSchema
  )
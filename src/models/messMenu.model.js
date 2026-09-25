import mongoose from 'mongoose'

const mealSchema = new mongoose.Schema({
  items: [{
    type: String,
    required: true
  }],
  timing: {
    type: String,
    default: null
    // e.g. "7:00 AM - 9:00 AM"
  },
  calories: {
    type: Number,
    default: null
  }
})

const messMenuSchema = new mongoose.Schema({
  // Week start date:
  weekStartDate: {
    type: Date,
    required: true
  },

  // Day wise menu:
  monday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },
  tuesday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },
  wednesday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },
  thursday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },
  friday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },
  saturday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },
  sunday: {
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema
  },

  // Special notice:
  specialNotice: {
    type: String,
    default: null
  },

  // Created by admin:
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

export const MessMenu = mongoose.model(
  'MessMenu', messMenuSchema
)
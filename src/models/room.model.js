import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  floor: {
    type: Number,
    required: true
  },
  block: {
    type: String,
    default: 'A'
  },
  type: {
    type: String,
    enum: ['single', 'double', 'triple'],
    default: 'double'
  },
  capacity: {
    type: Number,
    required: true
  },
  // Students in room:
  occupants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: [
      'available',
      'full',
      'maintenance'
    ],
    default: 'available'
  },
  amenities: [{
    type: String,
    enum: [
      'AC', 'Fan',
      'Attached Bathroom',
      'WiFi', 'Geyser',
      'Study Table'
    ]
  }],
  // Room photo S3 URL:
  photo: {
    type: String,
    default: null
  },
  monthlyRent: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

// Virtual — current occupancy:
roomSchema.virtual('occupancy').get(
  function() {
    return {
      current: this.occupants.length,
      total: this.capacity,
      available:
        this.capacity - this.occupants.length
    }
  }
)

export const Room = mongoose.model(
  'Room', roomSchema
)
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
  // Basic Info:
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },

  // Role:
  role: {
    type: String,
    enum: ['admin', 'student',
      'security', 'staff'],
    default: 'student'
  },

  // Student specific:
  studentId: {
    type: String,
    unique: true,
    sparse: true
  },
  course: {
    type: String,
    default: null
  },
  year: {
    type: Number,
    default: null
  },
  roomNumber: {
    type: String,
    default: null
  },

  // S3 URLs:
  photo: {
    type: String,
    default: null
  },
  documents: {
    aadhar: {
      type: String,
      default: null
    },
    parentId: {
      type: String,
      default: null
    }
  },

  // Status:
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: {
    type: String,
    default: null
  }
}, { timestamps: true })

// Password hash — save se pehle:
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(
    this.password, 10
  )
})

// Password check:
userSchema.methods.isPasswordCorrect =
  async function(password) {
    return await bcrypt.compare(
      password, this.password
    )
  }

// Token generate:
userSchema.methods.generateToken =
  function() {
    return jwt.sign(
      {
        _id: this._id,
        role: this.role,
        email: this.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    )
  }

export const User = mongoose.model(
  'User', userSchema
)
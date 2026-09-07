import jwt from 'jsonwebtoken'
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Verify JWT Token ──
export const verifyJWT = asyncHandler(
  async (req, res, next) => {

  const token =
    req.cookies?.token ||
    req.header("Authorization")
      ?.replace("Bearer ", "")

  if (!token) {
    throw new ApiError(401,
      "Unauthorized! Please login.")
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET
  )

  const user = await User.findById(
    decoded?._id
  ).select("-password -refreshToken")

  if (!user) {
    throw new ApiError(401,
      "Invalid token!")
  }

  if (!user.isActive) {
    throw new ApiError(403,
      "Account deactivated!")
  }

  req.user = user
  next()
})

// ── Admin Only ──
export const isAdmin = asyncHandler(
  async (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403,
      "Admin access required!")
  }
  next()
})

// ── Student Only ──
export const isStudent = asyncHandler(
  async (req, res, next) => {
  if (req.user.role !== 'student') {
    throw new ApiError(403,
      "Student access required!")
  }
  next()
})

// ── Security Only ──
export const isSecurity = asyncHandler(
  async (req, res, next) => {
  if (
    req.user.role !== 'security' &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403,
      "Security access required!")
  }
  next()
})

// ── Staff Only ──
export const isStaff = asyncHandler(
  async (req, res, next) => {
  if (
    req.user.role !== 'staff' &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403,
      "Staff access required!")
  }
  next()
})

// ── Admin or Staff ──
export const isAdminOrStaff = asyncHandler(
  async (req, res, next) => {
  if (
    req.user.role !== 'admin' &&
    req.user.role !== 'staff'
  ) {
    throw new ApiError(403,
      "Admin or Staff access required!")
  }
  next()
})
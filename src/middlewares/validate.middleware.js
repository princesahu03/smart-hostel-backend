import { ApiError } from '../utils/ApiError.js'

// Validate required fields:
export const validateFields = (fields) => {
  return (req, res, next) => {
    const missingFields = fields.filter(
      field => !req.body[field] ||
        req.body[field].toString().trim() === ''
    )

    if (missingFields.length > 0) {
      throw new ApiError(400,
        `Missing fields: 
        ${missingFields.join(', ')}`
      )
    }
    next()
  }
}

// Validate email format:
export const validateEmail = (
  req, res, next
) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (req.body.email &&
    !emailRegex.test(req.body.email)) {
    throw new ApiError(400,
      "Invalid email format!")
  }
  next()
}

// Validate phone number:
export const validatePhone = (
  req, res, next
) => {
  const phoneRegex = /^[6-9]\d{9}$/

  if (req.body.phone &&
    !phoneRegex.test(req.body.phone)) {
    throw new ApiError(400,
      "Invalid phone number! " +
      "Enter 10 digit Indian number.")
  }
  next()
}

// Validate MongoDB ObjectId:
export const validateObjectId = (
  paramName
) => {
  return (req, res, next) => {
    const id = req.params[paramName]
    const objectIdRegex =
      /^[0-9a-fA-F]{24}$/

    if (!objectIdRegex.test(id)) {
      throw new ApiError(400,
        `Invalid ${paramName}!`)
    }
    next()
  }
}
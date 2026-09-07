// 6 digit OTP generate:
export const generateOTP = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString()
}

// OTP expiry — 24 hours:
export const getOTPExpiry = () => {
  return new Date(
    Date.now() + 24 * 60 * 60 * 1000
  )
}
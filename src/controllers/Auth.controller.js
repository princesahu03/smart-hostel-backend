import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Cookie Options ──
const getCookieOptions = () => {
  const isProduction =
    process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}

// ── Register ──
const register = asyncHandler(
  async (req, res) => {
    const {
      name, email, password,
      phone, role, studentId,
      course, year
    } = req.body

    // Validation:
    if (!name || !email ||
        !password || !phone) {
      throw new ApiError(400,
        "Name, email, password, phone required!")
    }

    // Email already exists:
    const existedUser = await User.findOne({
      email
    })
    if (existedUser) {
      throw new ApiError(409,
        "Email already registered!")
    }

    // StudentId unique check:
    if (studentId) {
      const existedStudent =
        await User.findOne({ studentId })
      if (existedStudent) {
        throw new ApiError(409,
          "Student ID already exists!")
      }
    }

    // Photo S3 URL:
    const photo = req.file
      ? req.file.location
      : null

    // Create user:
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'student',
      studentId: studentId || undefined,
      course: course || null,
      year: year || null,
      photo
    })

    const createdUser = await
      User.findById(user._id)
      .select("-password -refreshToken")

    if (!createdUser) {
      throw new ApiError(500,
        "User creation failed!")
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        createdUser,
        "User registered successfully!"
      )
    )
  }
)

// ── Login ──
const login = asyncHandler(
  async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
      throw new ApiError(400,
        "Email and password required!")
    }

    // Find user:
    const user = await User.findOne({ email })
    if (!user) {
      throw new ApiError(404,
        "User not found!")
    }

    // Check active:
    if (!user.isActive) {
      throw new ApiError(403,
        "Account deactivated! Contact admin.")
    }

    // Password check:
    const isPasswordValid =
      await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
      throw new ApiError(401,
        "Wrong password!")
    }

    // Token generate:
    const token = user.generateToken()

    // Save token:
    const loggedInUser = await
      User.findById(user._id)
      .select("-password -refreshToken")

    return res
      .status(200)
      .cookie("token", token,
        getCookieOptions())
      .json(
        new ApiResponse(200, {
          user: loggedInUser,
          token
        }, "Login successful! 👋")
      )
  }
)

// ── Logout ──
const logout = asyncHandler(
  async (req, res) => {
    const isProduction =
      process.env.NODE_ENV === 'production'

    return res
      .status(200)
      .clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction
          ? 'none' : 'lax'
      })
      .json(
        new ApiResponse(
          200, {},
          "Logout successful!"
        )
      )
  }
)

// ── Get Current User ──
const getCurrentUser = asyncHandler(
  async (req, res) => {
    return res.status(200).json(
      new ApiResponse(
        200,
        req.user,
        "User fetched!"
      )
    )
  }
)

// ── Change Password ──
const changePassword = asyncHandler(
  async (req, res) => {
    const { oldPassword, newPassword } =
      req.body

    if (!oldPassword || !newPassword) {
      throw new ApiError(400,
        "Both passwords required!")
    }

    if (newPassword.length < 6) {
      throw new ApiError(400,
        "Password must be 6+ characters!")
    }

    const user = await User.findById(
      req.user._id
    )

    const isOldPasswordValid =
      await user.isPasswordCorrect(oldPassword)

    if (!isOldPasswordValid) {
      throw new ApiError(401,
        "Old password is wrong!")
    }

    user.password = newPassword
    await user.save({
      validateBeforeSave: false
    })

    return res.status(200).json(
      new ApiResponse(
        200, {},
        "Password changed successfully!"
      )
    )
  }
)

// ── Update Profile ──
const updateProfile = asyncHandler(
  async (req, res) => {
    const { name, phone, course, year } =
      req.body

    const updateData = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (course) updateData.course = course
    if (year) updateData.year = year

    // Photo update — S3 URL:
    if (req.file) {
      updateData.photo = req.file.location
    }

    const user = await
      User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true }
      ).select("-password -refreshToken")

    return res.status(200).json(
      new ApiResponse(
        200, user,
        "Profile updated!"
      )
    )
  }
)

// ── Upload Documents ──
const uploadDocuments = asyncHandler(
  async (req, res) => {
    const { docType } = req.body
    // docType = 'aadhar' or 'parentId'

    if (!docType) {
      throw new ApiError(400,
        "Document type required!")
    }

    if (!req.file) {
      throw new ApiError(400,
        "File required!")
    }

    // S3 URL:
    const fileUrl = req.file.location

    const updateField =
      `documents.${docType}`

    const user = await
      User.findByIdAndUpdate(
        req.user._id,
        { $set: { [updateField]: fileUrl } },
        { new: true }
      ).select("-password")

    return res.status(200).json(
      new ApiResponse(200, {
        user,
        uploadedUrl: fileUrl
      }, `${docType} uploaded to AWS S3!`)
    )
  }
)




// ── Get All Users ──
const getAllUsers = asyncHandler(
  async (req, res) => {
    const { role } = req.query
    const filter = {}
    if (role) filter.role = role

    const users = await User
      .find(filter)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })

    return res.status(200).json(
      new ApiResponse(200, users,
        "Users fetched!")
    )
  }
)

// ── Create User by Admin ──
const createUser = asyncHandler(
  async (req, res) => {
    const {
      name, email, password,
      phone, role, studentId,
      course, year
    } = req.body

    if (!name || !email ||
        !password || !phone) {
      throw new ApiError(400,
        "All fields required!")
    }

    const existed = await
      User.findOne({ email })
    if (existed) {
      throw new ApiError(409,
        "Email already exists!")
    }

    const user = await User.create({
      name, email, password, phone,
      role: role || 'student',
      studentId: studentId || undefined,
      course: course || null,
      year: year ? Number(year) : null
    })

    const created = await
      User.findById(user._id)
        .select("-password")

    return res.status(201).json(
      new ApiResponse(201, created,
        `${role} created!`)
    )
  }
)

// ── Toggle User Active Status ──
const toggleUserStatus = asyncHandler(
  async (req, res) => {
    const { userId } = req.params

    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(404,
        "User not found!")
    }

    user.isActive = !user.isActive
    await user.save()

    return res.status(200).json(
      new ApiResponse(200, user,
        user.isActive
          ? "User activated!"
          : "User deactivated!")
    )
  }
)


export {
   register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
  uploadDocuments,
  getAllUsers,      
  createUser,       
  toggleUserStatus  
}
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import { QREntry } from
  '../models/qrEntry.model.js'
import { User } from
  '../models/user.model.js'
import { ApiError } from
  '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Generate QR for Student ──
const generateStudentQR = asyncHandler(
  async (req, res) => {
    const student = await User.findById(
      req.user._id
    )

    if (!student) {
      throw new ApiError(404,
        "Student not found!")
    }

    // Generate unique QR data:
    let qrData = student.qrCode

    if (!qrData) {
      // First time — generate:
      qrData = `HOSTEL-${student._id}-${uuidv4()}`
      student.qrCode = qrData
      await student.save()
    }

    // Generate QR image (base64):
    const qrImage = await QRCode.toDataURL(
      qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a3c5e',
          light: '#ffffff'
        }
      }
    )

    return res.status(200).json(
      new ApiResponse(200, {
        qrCode: qrData,
        qrImage,
        studentName: student.name,
        studentId: student.studentId,
        roomNumber: student.roomNumber
      }, "QR Code generated!")
    )
  }
)

// ── Scan QR (Security Guard) ──
const scanQR = asyncHandler(
  async (req, res) => {
    const { qrCode, type, mealType } =
      req.body

    if (!qrCode || !type) {
      throw new ApiError(400,
        "QR code and type required!")
    }

    // Find student by QR:
    const student = await User.findOne({
      qrCode
    })

    if (!student) {
      throw new ApiError(404,
        "Invalid QR Code!")
    }

    if (student.role !== 'student') {
      throw new ApiError(400,
        "Not a student QR!")
    }

    // Check duplicate meal scan:
    if (type === 'meal') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(
        tomorrow.getDate() + 1
      )

      const existingMeal =
        await QREntry.findOne({
          student: student._id,
          type: 'meal',
          mealType,
          scanTime: {
            $gte: today,
            $lt: tomorrow
          }
        })

      if (existingMeal) {
        throw new ApiError(400,
          `${mealType} already taken today!`)
      }
    }

    // Check curfew (10 PM):
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const curfewHour = 22 // 10 PM
    let isLate = false

    if (type === 'entry') {
      isLate = hours >= curfewHour ||
        (hours === curfewHour &&
          minutes > 0)
    }

    // Create entry record:
    const entry = await QREntry.create({
      student: student._id,
      type,
      mealType: type === 'meal'
        ? mealType
        : null,
      scanTime: now,
      isLate,
      scannedBy: req.user._id
    })

    // Update student status:
    if (type === 'entry') {
      student.currentStatus = 'inside'
    } else if (type === 'exit') {
      student.currentStatus = 'outside'
    }

    // Curfew violation:
    if (isLate) {
      student.curfewViolations += 1
      await student.save()
    } else {
      await student.save()
    }

    const message = isLate
      ? `⚠️ LATE ENTRY! ${student.name} entered at ${now.toLocaleTimeString('en-IN')} — CURFEW VIOLATION #${student.curfewViolations}`
      : type === 'meal'
      ? `✅ ${mealType} marked for ${student.name}`
      : `✅ ${type === 'entry' ? 'Entry' : 'Exit'} recorded for ${student.name}`

    return res.status(201).json(
      new ApiResponse(201, {
        entry,
        student: {
          name: student.name,
          roomNumber: student.roomNumber,
          studentId: student.studentId,
          currentStatus: student.currentStatus,
          curfewViolations:
            student.curfewViolations,
          photo: student.photo
        },
        isLate,
        message
      }, message)
    )
  }
)

// ── Get Today's Entry/Exit Log ──
const getTodayLog = asyncHandler(
  async (req, res) => {
    const { type } = req.query

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const filter = {
      scanTime: {
        $gte: today,
        $lt: tomorrow
      }
    }

    if (type) filter.type = type

    const entries = await QREntry
      .find(filter)
      .populate('student',
        'name studentId roomNumber photo')
      .populate('scannedBy', 'name')
      .sort({ scanTime: -1 })

    // Stats:
    const totalEntries = entries.filter(
      e => e.type === 'entry'
    ).length
    const totalExits = entries.filter(
      e => e.type === 'exit'
    ).length
    const lateEntries = entries.filter(
      e => e.isLate
    ).length
    const mealScans = entries.filter(
      e => e.type === 'meal'
    ).length

    return res.status(200).json(
      new ApiResponse(200, {
        entries,
        stats: {
          totalEntries,
          totalExits,
          lateEntries,
          mealScans
        }
      }, "Today's log fetched!")
    )
  }
)

// ── Get Student's QR History ──
const getMyHistory = asyncHandler(
  async (req, res) => {
    const { page = 1, limit = 20 } =
      req.query

    const skip = (page - 1) * limit

    const history = await QREntry
      .find({ student: req.user._id })
      .sort({ scanTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await QREntry
      .countDocuments({
        student: req.user._id
      })

    return res.status(200).json(
      new ApiResponse(200, {
        history,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit)
      }, "History fetched!")
    )
  }
)

// ── Get Curfew Violators ──
const getCurfewViolators = asyncHandler(
  async (req, res) => {
    const violators = await User.find({
      role: 'student',
      curfewViolations: { $gt: 0 }
    })
    .select('name studentId roomNumber curfewViolations phone')
    .sort({ curfewViolations: -1 })

    return res.status(200).json(
      new ApiResponse(200, violators,
        "Curfew violators fetched!")
    )
  }
)

// ── Get Current Inside/Outside Count ──
const getCurrentStatus = asyncHandler(
  async (req, res) => {
    const insideCount = await User.countDocuments({
      role: 'student',
      currentStatus: 'inside',
      isActive: true
    })

    const outsideCount = await User.countDocuments({
      role: 'student',
      currentStatus: 'outside',
      isActive: true
    })

    const totalStudents = await User.countDocuments({
      role: 'student',
      isActive: true
    })

    return res.status(200).json(
      new ApiResponse(200, {
        inside: insideCount,
        outside: outsideCount,
        total: totalStudents
      }, "Status fetched!")
    )
  }
)

export {
  generateStudentQR,
  scanQR,
  getTodayLog,
  getMyHistory,
  getCurfewViolators,
  getCurrentStatus
}
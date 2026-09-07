import { Visitor } from
  '../models/visitor.model.js'
import { User } from
  '../models/user.model.js'
import { ApiError } from
  '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'
import {
  generateOTP,
  getOTPExpiry
} from '../utils/generateOTP.js'

// ── Request Visitor (Student) ──
const requestVisitor = asyncHandler(
  async (req, res) => {
    const {
      visitorName, visitorPhone,
      relation, purpose,
      visitDate, expectedTime
    } = req.body

    if (
      !visitorName || !visitorPhone ||
      !relation || !purpose ||
      !visitDate || !expectedTime
    ) {
      throw new ApiError(400,
        "All fields required!")
    }

    // ID Proof S3 URL:
    const idProof = req.file
      ? req.file.location
      : null

    const visitor = await Visitor.create({
      student: req.user._id,
      visitorName,
      visitorPhone,
      relation,
      purpose,
      visitDate: new Date(visitDate),
      expectedTime,
      idProof
    })

    const populated = await
      Visitor.findById(visitor._id)
      .populate('student',
        'name roomNumber phone')

    return res.status(201).json(
      new ApiResponse(201, populated,
        "Visitor request submitted! " +
        "Awaiting admin approval.")
    )
  }
)

// ── Get My Visitors (Student) ──
const getMyVisitors = asyncHandler(
  async (req, res) => {
    const { status } = req.query

    const filter = {
      student: req.user._id
    }
    if (status) filter.status = status

    const visitors = await Visitor
      .find(filter)
      .sort({ createdAt: -1 })

    return res.status(200).json(
      new ApiResponse(200, {
        visitors,
        total: visitors.length
      }, "Visitors fetched!")
    )
  }
)

// ── Get All Visitors (Admin) ──
const getAllVisitors = asyncHandler(
  async (req, res) => {
    const {
      status, date,
      page = 1, limit = 10
    } = req.query

    const filter = {}
    if (status) filter.status = status

    // Date filter:
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      filter.visitDate = {
        $gte: startDate,
        $lte: endDate
      }
    }

    const skip = (page - 1) * limit

    const visitors = await Visitor
      .find(filter)
      .populate('student',
        'name roomNumber phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total =
      await Visitor.countDocuments(filter)

    return res.status(200).json(
      new ApiResponse(200, {
        visitors,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit)
      }, "Visitors fetched!")
    )
  }
)

// ── Approve/Reject Visitor (Admin) ──
const updateVisitorStatus = asyncHandler(
  async (req, res) => {
    const { visitorId } = req.params
    const { status, rejectionReason } = req.body

    if (!status) {
      throw new ApiError(400,
        "Status required!")
    }

    const visitor =
      await Visitor.findById(visitorId)

    if (!visitor) {
      throw new ApiError(404,
        "Visitor request not found!")
    }

    if (visitor.status !== 'pending') {
      throw new ApiError(400,
        "Already processed!")
    }

    const updateData = { status }

    // Generate OTP if approved:
    if (status === 'approved') {
      const otp = generateOTP()
      updateData.otp = otp
      updateData.otpExpiry = getOTPExpiry()
    }

    if (status === 'rejected' && 
        rejectionReason) {
      updateData.rejectionReason =
        rejectionReason
    }

    const updated = await
      Visitor.findByIdAndUpdate(
        visitorId,
        updateData,
        { new: true }
      ).populate('student',
        'name roomNumber phone email')

    return res.status(200).json(
      new ApiResponse(200, updated,
        `Visitor ${status}! ` +
        (status === 'approved'
          ? `OTP: ${updated.otp}`
          : '')
      )
    )
  }
)

// ── Verify OTP + Check In (Security) ──
const checkInVisitor = asyncHandler(
  async (req, res) => {
    const { visitorId } = req.params
    const { otp } = req.body

    if (!otp) {
      throw new ApiError(400,
        "OTP required!")
    }

    const visitor =
      await Visitor.findById(visitorId)
      .populate('student',
        'name roomNumber')

    if (!visitor) {
      throw new ApiError(404,
        "Visitor not found!")
    }

    // Status check:
    if (visitor.status !== 'approved') {
      throw new ApiError(400,
        visitor.status === 'pending'
          ? "Visitor not approved yet!"
          : visitor.status === 'rejected'
          ? "Visitor was rejected!"
          : visitor.status === 'checked_in'
          ? "Already checked in!"
          : "Already checked out!")
    }

    // OTP check:
    if (visitor.otp !== otp) {
      throw new ApiError(400,
        "Invalid OTP!")
    }

    // OTP expiry check:
    if (visitor.otpExpiry < new Date()) {
      throw new ApiError(400,
        "OTP expired! Contact admin.")
    }

    // Check In:
    visitor.status = 'checked_in'
    visitor.checkInTime = new Date()
    visitor.otp = null
    visitor.otpExpiry = null
    await visitor.save()

    return res.status(200).json(
      new ApiResponse(200, visitor,
        `✅ Visitor ${visitor.visitorName}
        checked in! Room: 
        ${visitor.student?.roomNumber}`)
    )
  }
)

// ── Check Out (Security) ──
const checkOutVisitor = asyncHandler(
  async (req, res) => {
    const { visitorId } = req.params

    const visitor =
      await Visitor.findById(visitorId)

    if (!visitor) {
      throw new ApiError(404,
        "Visitor not found!")
    }

    if (visitor.status !== 'checked_in') {
      throw new ApiError(400,
        "Visitor not checked in!")
    }

    // Calculate duration:
    const checkOutTime = new Date()
    const duration = Math.floor(
      (checkOutTime - visitor.checkInTime)
      / (1000 * 60)
    ) // minutes

    visitor.status = 'checked_out'
    visitor.checkOutTime = checkOutTime
    visitor.duration = duration
    await visitor.save()

    return res.status(200).json(
      new ApiResponse(200, visitor,
        `✅ ${visitor.visitorName} 
        checked out! Duration: 
        ${duration} minutes`)
    )
  }
)

// ── Today's Visitors (Security) ──
const getTodayVisitors = asyncHandler(
  async (req, res) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const visitors = await Visitor
      .find({
        visitDate: {
          $gte: today,
          $lt: tomorrow
        },
        status: {
          $in: ['approved',
            'checked_in',
            'checked_out']
        }
      })
      .populate('student',
        'name roomNumber phone')
      .sort({ expectedTime: 1 })

    return res.status(200).json(
      new ApiResponse(200, {
        visitors,
        total: visitors.length,
        checkedIn: visitors.filter(
          v => v.status === 'checked_in'
        ).length,
        checkedOut: visitors.filter(
          v => v.status === 'checked_out'
        ).length
      }, "Today's visitors fetched!")
    )
  }
)

// ── Visitor Analytics (Admin) ──
const getVisitorAnalytics = asyncHandler(
  async (req, res) => {
    const byStatus = await Visitor.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    const byRelation = await Visitor.aggregate([
      {
        $group: {
          _id: "$relation",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    const avgDuration = await Visitor.aggregate([
      {
        $match: {
          status: 'checked_out',
          duration: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" },
          maxDuration: { $max: "$duration" }
        }
      }
    ])

    const monthly = await Visitor.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$visitDate" },
            year: { $year: "$visitDate" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: {
        "_id.year": -1,
        "_id.month": -1
      }},
      { $limit: 6 }
    ])

    return res.status(200).json(
      new ApiResponse(200, {
        byStatus,
        byRelation,
        avgDuration: avgDuration[0] || null,
        monthly
      }, "Analytics fetched!")
    )
  }
)

export {
  requestVisitor,
  getMyVisitors,
  getAllVisitors,
  updateVisitorStatus,
  checkInVisitor,
  checkOutVisitor,
  getTodayVisitors,
  getVisitorAnalytics
}
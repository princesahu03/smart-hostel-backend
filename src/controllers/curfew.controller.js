import { Curfew } from
  '../models/curfew.model.js'
import { CurfewViolation } from
  '../models/curfewViolation.model.js'
import { User } from '../models/user.model.js'
import { QREntry } from
  '../models/qrEntry.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Get Curfew Settings ──
const getCurfewSettings = asyncHandler(
  async (req, res) => {
    let settings = await Curfew.findOne({
      isActive: true
    })

    if (!settings) {
      settings = await Curfew.create({
        updatedBy: req.user._id
      })
    }

    return res.status(200).json(
      new ApiResponse(200, settings,
        "Curfew settings fetched!")
    )
  }
)

// ── Update Curfew Settings (Admin) ──
const updateCurfewSettings = asyncHandler(
  async (req, res) => {
    const {
      weekdayTime,
      weekendTime,
      gracePeriod,
      parentAlertAfter,
      strictMode,
      isActive
    } = req.body

    let settings = await Curfew.findOne({
      isActive: true
    })

    if (!settings) {
      settings = new Curfew()
    }

    if (weekdayTime)
      settings.weekdayTime = weekdayTime
    if (weekendTime)
      settings.weekendTime = weekendTime
    if (gracePeriod !== undefined)
      settings.gracePeriod = gracePeriod
    if (parentAlertAfter !== undefined)
      settings.parentAlertAfter =
        parentAlertAfter
    if (strictMode !== undefined)
      settings.strictMode = strictMode
    if (isActive !== undefined)
      settings.isActive = isActive

    settings.updatedBy = req.user._id
    await settings.save()

    return res.status(200).json(
      new ApiResponse(200, settings,
        "Curfew settings updated! ✅")
    )
  }
)

// ── Get All Violations (Admin) ──
const getAllViolations = asyncHandler(
  async (req, res) => {
    const {
      status, page = 1,
      limit = 20, studentId
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (studentId)
      filter.student = studentId

    const skip = (page - 1) * limit

    const violations = await
      CurfewViolation.find(filter)
      .populate('student',
        'name studentId roomNumber phone parentPhone course')
      .populate('actionBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await
      CurfewViolation.countDocuments(filter)

    // Stats:
    const stats = await
      CurfewViolation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])

    // Today violations:
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayCount = await
      CurfewViolation.countDocuments({
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      })

    return res.status(200).json(
      new ApiResponse(200, {
        violations,
        total,
        currentPage: Number(page),
        totalPages:
          Math.ceil(total / limit),
        stats,
        todayCount
      }, "Violations fetched!")
    )
  }
)

// ── Take Action on Violation ──
const takeAction = asyncHandler(
  async (req, res) => {
    const { violationId } = req.params
    const {
      status, actionTaken, remarks
    } = req.body

    const violation = await
      CurfewViolation.findById(
        violationId
      )

    if (!violation) {
      throw new ApiError(404,
        "Violation not found!")
    }

    violation.status = status
    violation.actionTaken =
      actionTaken || null
    violation.remarks = remarks || null
    violation.actionTakenAt = new Date()
    violation.actionBy = req.user._id

    await violation.save()

    const populated = await
      CurfewViolation.findById(
        violationId
      )
      .populate('student',
        'name studentId roomNumber')

    return res.status(200).json(
      new ApiResponse(200, populated,
        "Action taken! ✅")
    )
  }
)

// ── Get Violation Analytics ──
const getViolationAnalytics = asyncHandler(
  async (req, res) => {
    // Top violators:
    const topViolators = await
      CurfewViolation.aggregate([
        {
          $group: {
            _id: '$student',
            totalViolations: { $sum: 1 },
            avgMinutesLate: {
              $avg: '$minutesLate'
            }
          }
        },
        { $sort: {
          totalViolations: -1
        }},
        { $limit: 10 }
      ])

    // Populate:
    const studentIds = topViolators
      .map(v => v._id)
    const students = await User.find({
      _id: { $in: studentIds }
    }).select('name studentId roomNumber')

    const studentMap = {}
    students.forEach(s => {
      studentMap[s._id.toString()] = s
    })

    const topViolatorsData =
      topViolators.map(v => ({
        student: studentMap[
          v._id.toString()
        ],
        totalViolations: v.totalViolations,
        avgMinutesLate: Math.round(
          v.avgMinutesLate
        )
      }))

    // Violation by day of week:
    const byDayOfWeek = await
      CurfewViolation.aggregate([
        {
          $project: {
            dayOfWeek: {
              $dayOfWeek: '$entryTime'
            }
          }
        },
        {
          $group: {
            _id: '$dayOfWeek',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])

    // Last 7 days trend:
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 7
    )

    const weeklyTrend = await
      CurfewViolation.aggregate([
        {
          $match: {
            createdAt: {
              $gte: sevenDaysAgo
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$entryTime'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])

    // Total stats:
    const totalViolations = await
      CurfewViolation.countDocuments()
    const pendingViolations = await
      CurfewViolation.countDocuments({
        status: 'pending'
      })
    const parentNotified = await
      CurfewViolation.countDocuments({
        parentNotified: true
      })

    return res.status(200).json(
      new ApiResponse(200, {
        topViolators: topViolatorsData,
        byDayOfWeek,
        weeklyTrend,
        totalViolations,
        pendingViolations,
        parentNotified
      }, "Analytics fetched!")
    )
  }
)

// ── Get My Violations (Student) ──
const getMyViolations = asyncHandler(
  async (req, res) => {
    const violations = await
      CurfewViolation.find({
        student: req.user._id
      })
      .sort({ createdAt: -1 })
      .limit(20)

    const total = await
      CurfewViolation.countDocuments({
        student: req.user._id
      })

    return res.status(200).json(
      new ApiResponse(200, {
        violations, total
      }, "My violations fetched!")
    )
  }
)

// ── Mark Parent Notified ──
const markParentNotified = asyncHandler(
  async (req, res) => {
    const { violationId } = req.params

    const violation = await
      CurfewViolation.findById(violationId)

    if (!violation) {
      throw new ApiError(404,
        "Violation not found!")
    }

    violation.parentNotified = true
    violation.parentNotifiedAt = new Date()
    await violation.save()

    return res.status(200).json(
      new ApiResponse(200, violation,
        "Parent notification recorded!")
    )
  }
)

export {
  getCurfewSettings,
  updateCurfewSettings,
  getAllViolations,
  takeAction,
  getViolationAnalytics,
  getMyViolations,
  markParentNotified
}
import { Fee } from '../models/fee.model.js'
import { FeeRate } from'../models/feeRate.model.js'
import { User } from '../models/user.model.js'
import { Room } from '../models/room.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from'../utils/ApiResponse.js'
import { asyncHandler } from'../utils/asyncHandler.js'

// ── Get/Update Fee Rates (Admin) ──
const getFeeRates = asyncHandler(
  async (req, res) => {
    let rates = await FeeRate.findOne({
      isActive: true
    })

    if (!rates) {
      // Create default rates:
      rates = await FeeRate.create({
        updatedBy: req.user._id
      })
    }

    return res.status(200).json(
      new ApiResponse(200, rates,
        "Fee rates fetched!")
    )
  }
)

const updateFeeRates = asyncHandler(
  async (req, res) => {
    const {
      acSingleRoom, acDoubleRoom,
      acTripleRoom, nonAcSingleRoom,
      nonAcDoubleRoom, nonAcTripleRoom,
      messFee, maintenanceFee,
      securityDeposit, lateFeePerDay,
      dueDateDay, gracePeriodDays
    } = req.body

    let rates = await FeeRate.findOne({
      isActive: true
    })

    if (!rates) {
      rates = new FeeRate()
    }

    // Update fields:
    if (acSingleRoom)
      rates.acSingleRoom = acSingleRoom
    if (acDoubleRoom)
      rates.acDoubleRoom = acDoubleRoom
    if (acTripleRoom)
      rates.acTripleRoom = acTripleRoom
    if (nonAcSingleRoom)
      rates.nonAcSingleRoom = nonAcSingleRoom
    if (nonAcDoubleRoom)
      rates.nonAcDoubleRoom = nonAcDoubleRoom
    if (nonAcTripleRoom)
      rates.nonAcTripleRoom = nonAcTripleRoom
    if (messFee) rates.messFee = messFee
    if (maintenanceFee)
      rates.maintenanceFee = maintenanceFee
    if (securityDeposit)
      rates.securityDeposit = securityDeposit
    if (lateFeePerDay)
      rates.lateFeePerDay = lateFeePerDay
    if (dueDateDay)
      rates.dueDateDay = dueDateDay
    if (gracePeriodDays)
      rates.gracePeriodDays = gracePeriodDays

    rates.updatedBy = req.user._id
    await rates.save()

    return res.status(200).json(
      new ApiResponse(200, rates,
        "Fee rates updated!")
    )
  }
)

// ── Generate Monthly Fees (Admin) ──
const generateMonthlyFees = asyncHandler(
  async (req, res) => {
    const {
      month, year,
      includeMess = true,
      includeMaintenance = true
    } = req.body

    if (!month || !year) {
      throw new ApiError(400,
        "Month and year required!")
    }

    // Get rates:
    const rates = await FeeRate.findOne({
      isActive: true
    })

    if (!rates) {
      throw new ApiError(404,
        "Fee rates not configured!")
    }

    // Get all students with rooms:
    const students = await User.find({
      role: 'student',
      isActive: true,
      roomNumber: { $ne: null }
    })

    if (!students.length) {
      throw new ApiError(404,
        "No students with rooms found!")
    }

    let generated = 0
    let skipped = 0
    const errors = []

    for (const student of students) {
      try {
        // Find student's room:
        const room = await Room.findOne({
          roomNumber: student.roomNumber
        })

        if (!room) continue

        // Check if fee already exists:
        const existing = await Fee.findOne({
          student: student._id,
          month: parseInt(month),
          year: parseInt(year),
          feeType: 'hostel_fee'
        })

        if (existing) {
          skipped++
          continue
        }

        // Calculate fee:
        const hasAC = room.amenities
          ?.includes('AC')
        const roomType = hasAC
          ? 'ac' : 'non_ac'

        let feeAmount = 0

        if (hasAC) {
          if (room.type === 'single')
            feeAmount = rates.acSingleRoom
          else if (room.type === 'double')
            feeAmount = rates.acDoubleRoom
          else
            feeAmount = rates.acTripleRoom
        } else {
          if (room.type === 'single')
            feeAmount = rates.nonAcSingleRoom
          else if (room.type === 'double')
            feeAmount = rates.nonAcDoubleRoom
          else
            feeAmount = rates.nonAcTripleRoom
        }

        // Due date:
        const dueDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          rates.dueDateDay
        )

        // Create hostel fee:
        await Fee.create({
          student: student._id,
          room: room._id,
          amount: feeAmount,
          feeType: 'hostel_fee',
          roomType,
          month: parseInt(month),
          year: parseInt(year),
          dueDate,
          generatedBy: req.user._id
        })

        // Create mess fee:
        if (includeMess) {
          await Fee.create({
            student: student._id,
            room: room._id,
            amount: rates.messFee,
            feeType: 'mess_fee',
            month: parseInt(month),
            year: parseInt(year),
            dueDate,
            generatedBy: req.user._id
          })
        }

        // Create maintenance fee:
        if (includeMaintenance) {
          await Fee.create({
            student: student._id,
            room: room._id,
            amount: rates.maintenanceFee,
            feeType: 'maintenance_fee',
            month: parseInt(month),
            year: parseInt(year),
            dueDate,
            generatedBy: req.user._id
          })
        }

        generated++
      } catch (err) {
        errors.push({
          student: student.name,
          error: err.message
        })
      }
    }

    return res.status(201).json(
      new ApiResponse(201, {
        generated,
        skipped,
        errors
      }, `Fees generated for ${generated} students!`)
    )
  }
)

// ── Mark Fee as Paid (Admin) ──
const markFeePaid = asyncHandler(
  async (req, res) => {
    const { feeId } = req.params
    const {
      paidAmount,
      paymentMethod,
      transactionId,
      remarks
    } = req.body

    if (!paidAmount || !paymentMethod) {
      throw new ApiError(400,
        "Paid amount and payment method required!")
    }

    const fee = await Fee.findById(feeId)
    if (!fee) {
      throw new ApiError(404,
        "Fee record not found!")
    }

    if (fee.status === 'paid') {
      throw new ApiError(400,
        "Fee already paid!")
    }

    // Check if overdue:
    const today = new Date()
    let lateFee = 0

    if (today > fee.dueDate &&
        !fee.lateFeeApplied) {
      const rates = await FeeRate.findOne({
        isActive: true
      })

      if (rates) {
        const daysLate = Math.floor(
          (today - fee.dueDate) /
          (1000 * 60 * 60 * 24)
        )
        const graceDays =
          rates.gracePeriodDays || 5

        if (daysLate > graceDays) {
          lateFee = (daysLate - graceDays) *
            rates.lateFeePerDay
          fee.lateFee = lateFee
          fee.lateFeeApplied = true
        }
      }
    }

    fee.status = 'paid'
    fee.paidAt = new Date()
    fee.paidAmount = parseFloat(paidAmount)
    fee.paymentMethod = paymentMethod
    fee.transactionId =
      transactionId || null
    fee.remarks = remarks || null

    await fee.save()

    const populated = await
      Fee.findById(feeId)
      .populate('student',
        'name studentId roomNumber email')
      .populate('room', 'roomNumber type')

    return res.status(200).json(
      new ApiResponse(200, populated,
        "Fee marked as paid! ✅")
    )
  }
)

// ── Get All Fees (Admin) ──
const getAllFees = asyncHandler(
  async (req, res) => {
    const {
      month, year, status,
      feeType, page = 1, limit = 20
    } = req.query

    const filter = {}
    if (month) filter.month = parseInt(month)
    if (year) filter.year = parseInt(year)
    if (status) filter.status = status
    if (feeType) filter.feeType = feeType

    const skip = (page - 1) * limit

    const fees = await Fee.find(filter)
      .populate('student',
        'name studentId roomNumber email phone')
      .populate('room',
        'roomNumber type amenities')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total =
      await Fee.countDocuments(filter)

    // Summary stats:
    const summary = await Fee.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ])

    return res.status(200).json(
      new ApiResponse(200, {
        fees,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        summary
      }, "Fees fetched!")
    )
  }
)

// ── Get Fee Analytics (Admin) ──
const getFeeAnalytics = asyncHandler(
  async (req, res) => {
    const currentMonth =
      new Date().getMonth() + 1
    const currentYear =
      new Date().getFullYear()

    const [
      thisMonthCollection,
      pendingFees,
      overdueFees,
      collectionByType,
      monthlyTrend
    ] = await Promise.all([
      // This month total:
      Fee.aggregate([
        {
          $match: {
            month: currentMonth,
            year: currentYear,
            status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paidAmount' }
          }
        }
      ]),

      // Total pending:
      Fee.aggregate([
        {
          $match: { status: 'pending' }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Overdue:
      Fee.countDocuments({
        status: 'pending',
        dueDate: { $lt: new Date() }
      }),

      // Collection by fee type:
      Fee.aggregate([
        {
          $match: {
            status: 'paid',
            month: currentMonth,
            year: currentYear
          }
        },
        {
          $group: {
            _id: '$feeType',
            total: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 6 month trend:
      Fee.aggregate([
        {
          $match: {
            status: 'paid'
          }
        },
        {
          $group: {
            _id: {
              month: '$month',
              year: '$year'
            },
            total: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            '_id.year': -1,
            '_id.month': -1
          }
        },
        { $limit: 6 }
      ])
    ])

    return res.status(200).json(
      new ApiResponse(200, {
        thisMonthCollection:
          thisMonthCollection[0]?.total || 0,
        pendingCount:
          pendingFees[0]?.count || 0,
        pendingAmount:
          pendingFees[0]?.total || 0,
        overdueFees,
        collectionByType,
        monthlyTrend
      }, "Fee analytics fetched!")
    )
  }
)

// ── Get Defaulters (Admin) ──
const getDefaulters = asyncHandler(
  async (req, res) => {
    const today = new Date()

    // Find overdue fees:
    const overdueFees = await Fee.find({
      status: 'pending',
      dueDate: { $lt: today }
    })
    .populate('student',
      'name studentId roomNumber email phone parentPhone')
    .populate('room', 'roomNumber')
    .sort({ dueDate: 1 })

    // Group by student:
    const defaulterMap = {}
    overdueFees.forEach(fee => {
      const studentId =
        fee.student?._id?.toString()
      if (!studentId) return

      if (!defaulterMap[studentId]) {
        defaulterMap[studentId] = {
          student: fee.student,
          fees: [],
          totalDue: 0
        }
      }
      defaulterMap[studentId].fees
        .push(fee)
      defaulterMap[studentId].totalDue +=
        fee.amount
    })

    const defaulters =
      Object.values(defaulterMap)
        .sort((a, b) =>
          b.totalDue - a.totalDue
        )

    return res.status(200).json(
      new ApiResponse(200, {
        defaulters,
        total: defaulters.length
      }, "Defaulters fetched!")
    )
  }
)

// ── Get My Fees (Student) ──
const getMyFees = asyncHandler(
  async (req, res) => {
    const { month, year, status } = req.query

    const filter = {
      student: req.user._id
    }
    if (month) filter.month = parseInt(month)
    if (year) filter.year = parseInt(year)
    if (status) filter.status = status

    const fees = await Fee.find(filter)
      .populate('room', 'roomNumber type')
      .sort({
        year: -1,
        month: -1,
        createdAt: -1
      })

    // Total pending:
    const totalPending = fees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0)

    const totalPaid = fees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) =>
        sum + (f.paidAmount || 0), 0)

    return res.status(200).json(
      new ApiResponse(200, {
        fees,
        totalPending,
        totalPaid,
        total: fees.length
      }, "My fees fetched!")
    )
  }
)

export {
  getFeeRates,
  updateFeeRates,
  generateMonthlyFees,
  markFeePaid,
  getAllFees,
  getFeeAnalytics,
  getDefaulters,
  getMyFees
}
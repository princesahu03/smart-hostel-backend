import { Complaint } from'../models/complaint.model.js'
import { User } from '../models/user.model.js'
import { autoAssignStaff } from'../utils/autoAssign.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from'../utils/ApiResponse.js'
import { asyncHandler } from'../utils/asyncHandler.js'

// ── Create Complaint (Student) ──
const createComplaint = asyncHandler(
  async (req, res) => {
    const {
      category, title,
      description, priority
    } = req.body

    if (!category || !title || !description) {
      throw new ApiError(400,
        "Category, title and " +
        "description required!")
    }

    // Auto assign staff:
    const assignedTo =
      await autoAssignStaff(category)

    // Set 48hr deadline:
    const deadline = new Date()
    deadline.setHours(
      deadline.getHours() + 48
    )

    const complaint = await Complaint.create({
      student: req.user._id,
      roomNumber: req.user.roomNumber || null,
      category,
      title,
      description,
      photo: req.file?.location || null,
      priority: priority || 'medium',
      assignedTo: assignedTo || null,
      assignedAt: assignedTo
        ? new Date() : null,
      status: assignedTo
        ? 'assigned' : 'pending',
      deadline,
      statusHistory: [{
        status: assignedTo
          ? 'assigned' : 'pending',
        updatedBy: req.user._id,
        remark: assignedTo
          ? 'Auto-assigned to staff'
          : 'Complaint registered',
        updatedAt: new Date()
      }]
    })

    const populated = await
      Complaint.findById(complaint._id)
      .populate('student',
        'name email roomNumber')
      .populate('assignedTo', 'name email')

    return res.status(201).json(
      new ApiResponse(201, populated,
        "Complaint raised! ✅")
    )
  }
)

// ── Get My Complaints (Student) ──
const getMyComplaints = asyncHandler(
  async (req, res) => {
    const { status } = req.query
    const filter = {
      student: req.user._id
    }
    if (status) filter.status = status

    const complaints = await Complaint
      .find(filter)
      .populate('assignedTo',
        'name email phone')
      .sort({ createdAt: -1 })

    return res.status(200).json(
      new ApiResponse(200, complaints,
        "Complaints fetched!")
    )
  }
)

// ── Get All Complaints (Admin) ──
const getAllComplaints = asyncHandler(
  async (req, res) => {
    const {
      status, category,
      priority, page = 1, limit = 20
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (priority) filter.priority = priority

    const skip = (page - 1) * limit

    const complaints = await Complaint
      .find(filter)
      .populate('student',
        'name email roomNumber studentId phone')
      .populate('assignedTo',
        'name email phone')
      .sort({
        priority: -1,
        createdAt: -1
      })
      .skip(skip)
      .limit(parseInt(limit))

    const total =
      await Complaint.countDocuments(filter)

    return res.status(200).json(
      new ApiResponse(200, {
        complaints,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit)
      }, "Complaints fetched!")
    )
  }
)

// ── Update Complaint Status (Admin/Staff) ──
const updateComplaintStatus = asyncHandler(
  async (req, res) => {
    const { complaintId } = req.params
    const {
      status, remarks,
      assignedTo, rejectionReason
    } = req.body

    const complaint =
      await Complaint.findById(complaintId)

    if (!complaint) {
      throw new ApiError(404,
        "Complaint not found!")
    }

    // Store old status:
    const oldStatus = complaint.status

    // Update fields:
    complaint.status = status
    complaint.remarks = remarks || null

    if (status === 'resolved') {
      complaint.resolvedAt = new Date()
      complaint.resolutionPhoto =
        req.file?.location || null
    }

    if (status === 'rejected') {
      complaint.rejectionReason =
        rejectionReason || remarks
    }

    if (status === 'assigned' && assignedTo) {
      complaint.assignedTo = assignedTo
      complaint.assignedAt = new Date()
    }

    if (status === 'in_progress') {
      complaint.assignedTo =
        complaint.assignedTo ||
        req.user._id
    }

    // Add to history:
    complaint.statusHistory.push({
      status,
      updatedBy: req.user._id,
      remark: remarks ||
        rejectionReason || null,
      updatedAt: new Date()
    })

    await complaint.save()

    const populated = await
      Complaint.findById(complaint._id)
      .populate('student',
        'name email roomNumber')
      .populate('assignedTo', 'name email')
      .populate('statusHistory.updatedBy',
        'name role')

    return res.status(200).json(
      new ApiResponse(200, populated,
        `Status updated to ${status}!`)
    )
  }
)

// ── Student Confirm Resolution ──
const confirmResolution = asyncHandler(
  async (req, res) => {
    const { complaintId } = req.params
    const {
      confirmed,
      feedback,
      staffRating
    } = req.body

    const complaint =
      await Complaint.findById(complaintId)

    if (!complaint) {
      throw new ApiError(404,
        "Complaint not found!")
    }

    // Check ownership:
    if (complaint.student.toString() !==
        req.user._id.toString()) {
      throw new ApiError(403,
        "Not your complaint!")
    }

    if (complaint.status !== 'resolved') {
      throw new ApiError(400,
        "Complaint not resolved yet!")
    }

    complaint.studentConfirmed = confirmed
    complaint.studentFeedback =
      feedback || null
    complaint.staffRating =
      staffRating || null

    // If student rejects — reopen:
    if (!confirmed) {
      complaint.status = 'reopened'
      complaint.statusHistory.push({
        status: 'reopened',
        updatedBy: req.user._id,
        remark: feedback ||
          'Student rejected resolution',
        updatedAt: new Date()
      })
    }

    await complaint.save()

    return res.status(200).json(
      new ApiResponse(200, complaint,
        confirmed
          ? "Resolution confirmed! ✅"
          : "Complaint reopened!")
    )
  }
)

// ── Get Complaint Analytics (Admin) ──
const getComplaintAnalytics = asyncHandler(
  async (req, res) => {

    const [
      byCategory,
      byStatus,
      byPriority,
      escalated,
      avgResolutionTime,
      staffPerformance,
      todayComplaints
    ] = await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      Complaint.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),

      Complaint.countDocuments({
        isEscalated: true
      }),

      Complaint.aggregate([
        {
          $match: {
            status: 'resolved',
            resolvedAt: { $ne: null }
          }
        },
        {
          $project: {
            resolutionHours: {
              $divide: [
                {
                  $subtract: [
                    '$resolvedAt',
                    '$createdAt'
                  ]
                },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avg: { $avg: '$resolutionHours' }
          }
        }
      ]),

      Complaint.aggregate([
        {
          $match: {
            assignedTo: { $ne: null },
            status: 'resolved'
          }
        },
        {
          $group: {
            _id: '$assignedTo',
            resolved: { $sum: 1 },
            avgRating: {
              $avg: '$staffRating'
            }
          }
        },
        { $sort: { resolved: -1 } },
        { $limit: 5 }
      ]),

      (() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(
          tomorrow.getDate() + 1
        )
        return Complaint.countDocuments({
          createdAt: {
            $gte: today,
            $lt: tomorrow
          }
        })
      })()
    ])

    // Populate staff performance:
    const staffIds = staffPerformance
      .map(s => s._id)
    const staffUsers = await User.find({
      _id: { $in: staffIds }
    }).select('name')

    const staffMap = {}
    staffUsers.forEach(u => {
      staffMap[u._id.toString()] = u.name
    })

    const staffPerformanceData =
      staffPerformance.map(s => ({
        name: staffMap[
          s._id.toString()
        ] || 'Unknown',
        resolved: s.resolved,
        avgRating: s.avgRating
      }))

    return res.status(200).json(
      new ApiResponse(200, {
        byCategory,
        byStatus,
        byPriority,
        escalated,
        avgResolutionTime:
          avgResolutionTime[0]?.avg || 0,
        staffPerformance:
          staffPerformanceData,
        todayComplaints
      }, "Analytics fetched!")
    )
  }
)

// ── Get Staff Complaints ──
const getStaffComplaints = asyncHandler(
  async (req, res) => {
    const { status } = req.query
    const filter = {
      assignedTo: req.user._id
    }
    if (status) filter.status = status

    const complaints = await Complaint
      .find(filter)
      .populate('student',
        'name roomNumber phone')
      .sort({
        priority: -1,
        createdAt: -1
      })

    return res.status(200).json(
      new ApiResponse(200, complaints,
        "Staff complaints fetched!")
    )
  }
)

// ── Delete Complaint ──
const deleteComplaint = asyncHandler(
  async (req, res) => {
    const { complaintId } = req.params

    const complaint =
      await Complaint.findById(complaintId)

    if (!complaint) {
      throw new ApiError(404,
        "Complaint not found!")
    }

    await complaint.deleteOne()

    return res.status(200).json(
      new ApiResponse(200, {},
        "Complaint deleted!")
    )
  }
)

export {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  confirmResolution,
  getComplaintAnalytics,
  getStaffComplaints,
  deleteComplaint
}
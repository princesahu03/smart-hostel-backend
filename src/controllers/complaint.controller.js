import { Complaint } from
  '../models/complaint.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Create Complaint (Student) ──
const createComplaint = asyncHandler(
  async (req, res) => {
    const {
      category, title,
      description, priority
    } = req.body

    if (!category || !title || !description) {
      throw new ApiError(400,
        "Category, title, description required!")
    }

    // Photo S3 URL:
    const photo = req.file
      ? req.file.location
      : null

    const complaint = await Complaint.create({
      student: req.user._id,
      category,
      title,
      description,
      priority: priority || 'medium',
      photo,
      statusHistory: [{
        status: 'pending',
        updatedBy: req.user._id,
        remark: 'Complaint raised'
      }]
    })

    const populatedComplaint = await
      Complaint.findById(complaint._id)
      .populate('student', 'name email roomNumber')

    return res.status(201).json(
      new ApiResponse(201,
        populatedComplaint,
        "Complaint raised successfully!")
    )
  }
)

// ── Get My Complaints (Student) ──
const getMyComplaints = asyncHandler(
  async (req, res) => {
    const { status, category } = req.query
    const filter = {
      student: req.user._id
    }

    if (status) filter.status = status
    if (category) filter.category = category

    const complaints = await Complaint
      .find(filter)
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })

    return res.status(200).json(
      new ApiResponse(200, {
        complaints,
        total: complaints.length
      }, "Complaints fetched!")
    )
  }
)

// ── Get All Complaints (Admin/Staff) ──
const getAllComplaints = asyncHandler(
  async (req, res) => {
    const {
      status, category,
      priority, page = 1,
      limit = 10
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (priority) filter.priority = priority

    const skip = (page - 1) * limit

    const complaints = await Complaint
      .find(filter)
      .populate('student',
        'name email roomNumber photo')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
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
      status, remarks, assignedTo
    } = req.body

    if (!status) {
      throw new ApiError(400,
        "Status required!")
    }

    const complaint =
      await Complaint.findById(complaintId)

    if (!complaint) {
      throw new ApiError(404,
        "Complaint not found!")
    }

    // Update fields:
    complaint.status = status
    if (remarks) complaint.remarks = remarks
    if (assignedTo)
      complaint.assignedTo = assignedTo
    if (status === 'resolved') {
      complaint.resolvedAt = new Date()
    }

    // Add to history:
    complaint.statusHistory.push({
      status,
      updatedBy: req.user._id,
      remark: remarks || `Status: ${status}`
    })

    await complaint.save()

    const updated = await
      Complaint.findById(complaintId)
      .populate('student',
        'name email roomNumber')
      .populate('assignedTo', 'name')

    return res.status(200).json(
      new ApiResponse(200, updated,
        `Complaint ${status}!`)
    )
  }
)

// ── Get Complaint Analytics ──
const getComplaintAnalytics = asyncHandler(
  async (req, res) => {
    const byStatus = await Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    const byCategory =
      await Complaint.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])

    const byPriority =
      await Complaint.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 }
          }
        }
      ])

    const monthly = await Complaint.aggregate([
      {
        $group: {
          _id: {
            month: {
              $month: "$createdAt"
            },
            year: {
              $year: "$createdAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1,
        "_id.month": -1 } },
      { $limit: 6 }
    ])

    return res.status(200).json(
      new ApiResponse(200, {
        byStatus,
        byCategory,
        byPriority,
        monthly
      }, "Analytics fetched!")
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

    // Only student who raised or admin:
    if (
      complaint.student.toString() !==
        req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      throw new ApiError(403,
        "Not authorized!")
    }

    await Complaint.findByIdAndDelete(
      complaintId
    )

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
  getComplaintAnalytics,
  deleteComplaint
}
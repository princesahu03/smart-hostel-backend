import { Notice } from
  '../models/notice.model.js'
import { ApiError } from
  '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Create Notice (Admin) ──
const createNotice = asyncHandler(
  async (req, res) => {
    const {
      title, content,
      type, targetRole, expiresAt
    } = req.body

    if (!title || !content) {
      throw new ApiError(400,
        "Title and content required!")
    }

    const notice = await Notice.create({
      title,
      content,
      type: type || 'general',
      targetRole: targetRole || 'all',
      postedBy: req.user._id,
      expiresAt: expiresAt || null
    })

    return res.status(201).json(
      new ApiResponse(201, notice,
        "Notice posted!")
    )
  }
)

// ── Get Notices ──
const getNotices = asyncHandler(
  async (req, res) => {
    const { type } = req.query

    const filter = {
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } }
      ],
      $or: [
        { targetRole: 'all' },
        { targetRole: req.user.role }
      ]
    }

    if (type) filter.type = type

    const notices = await Notice
      .find(filter)
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })

    return res.status(200).json(
      new ApiResponse(200, notices,
        "Notices fetched!")
    )
  }
)

// ── Delete Notice (Admin) ──
const deleteNotice = asyncHandler(
  async (req, res) => {
    const { noticeId } = req.params

    const notice = await
      Notice.findByIdAndDelete(noticeId)

    if (!notice) {
      throw new ApiError(404,
        "Notice not found!")
    }

    return res.status(200).json(
      new ApiResponse(200, {},
        "Notice deleted!")
    )
  }
)

export {
  createNotice,
  getNotices,
  deleteNotice
}
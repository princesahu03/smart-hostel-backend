import { MessMenu } from
  '../models/messMenu.model.js'
import { MealFeedback } from
  '../models/mealFeedback.model.js'
import { MealLeave } from
  '../models/mealLeave.model.js'
import { QREntry } from
  '../models/qrEntry.model.js'
import { ApiError } from
  '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Create/Update Weekly Menu (Admin) ──
const createWeeklyMenu = asyncHandler(
  async (req, res) => {
    const {
      weekStartDate,
      monday, tuesday,
      wednesday, thursday,
      friday, saturday,
      sunday, specialNotice
    } = req.body

    if (!weekStartDate) {
      throw new ApiError(400,
        "Week start date required!")
    }

    // Deactivate old menus:
    await MessMenu.updateMany(
      {},
      { isActive: false }
    )

    const menu = await MessMenu.create({
      weekStartDate: new Date(weekStartDate),
      monday, tuesday, wednesday,
      thursday, friday, saturday, sunday,
      specialNotice,
      createdBy: req.user._id
    })

    return res.status(201).json(
      new ApiResponse(201, menu,
        "Weekly menu created!")
    )
  }
)

// ── Get Current Week Menu ──
const getCurrentMenu = asyncHandler(
  async (req, res) => {
    const menu = await MessMenu
      .findOne({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })

    if (!menu) {
      return res.status(200).json(
        new ApiResponse(200, null,
          "No menu for this week!")
      )
    }

    // Get today's day:
    const days = [
      'sunday', 'monday', 'tuesday',
      'wednesday', 'thursday',
      'friday', 'saturday'
    ]
    const todayDay =
      days[new Date().getDay()]

    const todayMenu = menu[todayDay] || null

    return res.status(200).json(
      new ApiResponse(200, {
        menu,
        todayDay,
        todayMenu
      }, "Menu fetched!")
    )
  }
)

// ── Get All Menus ──
const getAllMenus = asyncHandler(
  async (req, res) => {
    const menus = await MessMenu
      .find()
      .sort({ createdAt: -1 })
      .limit(5)

    return res.status(200).json(
      new ApiResponse(200, menus,
        "Menus fetched!")
    )
  }
)

// ── Submit Meal Feedback (Student) ──
const submitFeedback = asyncHandler(
  async (req, res) => {
    const {
      mealType, rating,
      tasteRating, qualityRating,
      quantityRating, comment, date
    } = req.body

    if (!mealType || !rating) {
      throw new ApiError(400,
        "Meal type and rating required!")
    }

    if (rating < 1 || rating > 5) {
      throw new ApiError(400,
        "Rating must be 1-5!")
    }

    const mealDate = date
      ? new Date(date)
      : new Date()
    mealDate.setHours(0, 0, 0, 0)

    // Check duplicate:
    const existing = await
      MealFeedback.findOne({
        student: req.user._id,
        mealType,
        date: mealDate
      })

    if (existing) {
      // Update existing:
      existing.rating = rating
      existing.tasteRating = tasteRating
      existing.qualityRating = qualityRating
      existing.quantityRating = quantityRating
      existing.comment = comment
      await existing.save()

      return res.status(200).json(
        new ApiResponse(200, existing,
          "Feedback updated!")
      )
    }

    const feedback = await
      MealFeedback.create({
        student: req.user._id,
        mealType,
        rating,
        tasteRating: tasteRating || null,
        qualityRating: qualityRating || null,
        quantityRating:
          quantityRating || null,
        comment: comment || null,
        date: mealDate
      })

    return res.status(201).json(
      new ApiResponse(201, feedback,
        "Feedback submitted! 🙏")
    )
  }
)

// ── Get Feedback Analytics (Admin) ──
const getFeedbackAnalytics = asyncHandler(
  async (req, res) => {
    const { days = 7 } = req.query

    const startDate = new Date()
    startDate.setDate(
      startDate.getDate() - parseInt(days)
    )

    // Average ratings:
    const avgRatings =
      await MealFeedback.aggregate([
        {
          $match: {
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$mealType',
            avgRating: { $avg: '$rating' },
            avgTaste: {
              $avg: '$tasteRating'
            },
            avgQuality: {
              $avg: '$qualityRating'
            },
            avgQuantity: {
              $avg: '$quantityRating'
            },
            totalFeedbacks: { $sum: 1 }
          }
        }
      ])

    // Daily average:
    const dailyAvg =
      await MealFeedback.aggregate([
        {
          $match: {
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: '$date',
              mealType: '$mealType'
            },
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ])

    // Recent comments:
    const recentComments =
      await MealFeedback.find({
        comment: { $ne: null },
        date: { $gte: startDate }
      })
      .populate('student', 'name')
      .sort({ createdAt: -1 })
      .limit(10)

    // Today's meal counts:
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayMealCounts =
      await QREntry.aggregate([
        {
          $match: {
            type: 'meal',
            scanTime: {
              $gte: today
            }
          }
        },
        {
          $group: {
            _id: '$mealType',
            count: { $sum: 1 }
          }
        }
      ])

    return res.status(200).json(
      new ApiResponse(200, {
        avgRatings,
        dailyAvg,
        recentComments,
        todayMealCounts
      }, "Analytics fetched!")
    )
  }
)

// ── Mark Meal Leave (Student) ──
const markMealLeave = asyncHandler(
  async (req, res) => {
    const {
      fromDate, toDate,
      skipMeals, reason
    } = req.body

    if (!fromDate || !toDate ||
        !skipMeals?.length) {
      throw new ApiError(400,
        "From date, to date and " +
        "meals required!")
    }

    const leave = await MealLeave.create({
      student: req.user._id,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      skipMeals,
      reason: reason || null
    })

    return res.status(201).json(
      new ApiResponse(201, leave,
        "Meal leave marked! ✅")
    )
  }
)

// ── Get Meal Leave List (Admin) ──
const getMealLeaves = asyncHandler(
  async (req, res) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const leaves = await MealLeave
      .find({
        toDate: { $gte: today }
      })
      .populate('student',
        'name studentId roomNumber')
      .sort({ fromDate: 1 })

    return res.status(200).json(
      new ApiResponse(200, leaves,
        "Meal leaves fetched!")
    )
  }
)

// ── Get My Feedbacks ──
const getMyFeedbacks = asyncHandler(
  async (req, res) => {
    const feedbacks = await MealFeedback
      .find({ student: req.user._id })
      .sort({ date: -1 })
      .limit(30)

    return res.status(200).json(
      new ApiResponse(200, feedbacks,
        "Feedbacks fetched!")
    )
  }
)

export {
  createWeeklyMenu,
  getCurrentMenu,
  getAllMenus,
  submitFeedback,
  getFeedbackAnalytics,
  markMealLeave,
  getMealLeaves,
  getMyFeedbacks
}
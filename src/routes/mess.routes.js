import { Router } from 'express'
import {
  createWeeklyMenu,
  getCurrentMenu,
  getAllMenus,
  submitFeedback,
  getFeedbackAnalytics,
  markMealLeave,
  getMealLeaves,
  getMyFeedbacks
} from '../controllers/mess.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

// All users:
router.route('/menu/current')
  .get(getCurrentMenu)

// Student routes:
router.route('/feedback')
  .post(submitFeedback)
  .get(getMyFeedbacks)

router.route('/meal-leave')
  .post(markMealLeave)

// Admin routes:
router.route('/menu')
  .post(isAdmin, createWeeklyMenu)
  .get(isAdmin, getAllMenus)

router.route('/feedback/analytics')
  .get(isAdmin, getFeedbackAnalytics)

router.route('/meal-leaves')
  .get(isAdmin, getMealLeaves)

export default router
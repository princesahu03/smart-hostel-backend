import { Router } from 'express'
import {
  getFeeRates,
  updateFeeRates,
  generateMonthlyFees,
  markFeePaid,
  getAllFees,
  getFeeAnalytics,
  getDefaulters,
  getMyFees
} from '../controllers/fee.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

// Student:
router.route('/my').get(getMyFees)

// Admin:
router.route('/rates')
  .get(isAdmin, getFeeRates)
  .put(isAdmin, updateFeeRates)

router.route('/generate')
  .post(isAdmin, generateMonthlyFees)

router.route('/all')
  .get(isAdmin, getAllFees)

router.route('/analytics')
  .get(isAdmin, getFeeAnalytics)

router.route('/defaulters')
  .get(isAdmin, getDefaulters)

router.route('/:feeId/pay')
  .patch(isAdmin, markFeePaid)

export default router
import { Router } from 'express'
import {
  getCurfewSettings,
  updateCurfewSettings,
  getAllViolations,
  takeAction,
  getViolationAnalytics,
  getMyViolations,
  markParentNotified
} from
  '../controllers/curfew.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

// All:
router.route('/settings')
  .get(getCurfewSettings)

// Student:
router.route('/my-violations')
  .get(getMyViolations)

// Admin:
router.route('/settings')
  .put(isAdmin, updateCurfewSettings)

router.route('/violations')
  .get(isAdmin, getAllViolations)

router.route('/analytics')
  .get(isAdmin, getViolationAnalytics)

router.route('/violations/:violationId/action')
  .patch(isAdmin, takeAction)

router.route('/violations/:violationId/notify-parent')
  .patch(isAdmin, markParentNotified)

export default router
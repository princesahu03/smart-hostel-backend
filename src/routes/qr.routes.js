import { Router } from 'express'
import {
  generateStudentQR,
  scanQR,
  getTodayLog,
  getMyHistory,
  getCurfewViolators,
  getCurrentStatus
} from '../controllers/qr.controller.js'
import {
  verifyJWT,
  isAdmin,
  isSecurity
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

// Student routes:
router.route('/my-qr')
  .get(generateStudentQR)

router.route('/my-history')
  .get(getMyHistory)

// Security routes:
router.route('/scan')
  .post(isSecurity, scanQR)

router.route('/today-log')
  .get(isSecurity, getTodayLog)

// Admin routes:
router.route('/curfew-violators')
  .get(isAdmin, getCurfewViolators)

router.route('/current-status')
  .get(isAdmin, getCurrentStatus)

export default router
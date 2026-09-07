import { Router } from 'express'
import {
  requestVisitor,
  getMyVisitors,
  getAllVisitors,
  updateVisitorStatus,
  checkInVisitor,
  checkOutVisitor,
  getTodayVisitors,
  getVisitorAnalytics
} from
  '../controllers/visitor.controller.js'
import {
  verifyJWT,
  isAdmin,
  isSecurity
} from '../middlewares/auth.middleware.js'
import { uploadToS3 } from
  '../config/s3.js'

const router = Router()
router.use(verifyJWT)

// ── Student Routes ──
router.route('/request').post(
  uploadToS3('visitor-ids').single('idProof'),
  requestVisitor
)
router.route('/my').get(getMyVisitors)

// ── Admin Routes ──
router.route('/all')
  .get(isAdmin, getAllVisitors)
router.route('/analytics')
  .get(isAdmin, getVisitorAnalytics)
router.route('/:visitorId/status')
  .patch(isAdmin, updateVisitorStatus)

// ── Security Routes ──
router.route('/today')
  .get(isSecurity, getTodayVisitors)
router.route('/:visitorId/checkin')
  .post(isSecurity, checkInVisitor)
router.route('/:visitorId/checkout')
  .post(isSecurity, checkOutVisitor)

export default router
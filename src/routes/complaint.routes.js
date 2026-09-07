import { Router } from 'express'
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  getComplaintAnalytics,
  deleteComplaint
} from
  '../controllers/complaint.controller.js'
import {
  verifyJWT,
  isAdmin,
  isAdminOrStaff
} from '../middlewares/auth.middleware.js'
import { uploadToS3 } from '../config/s3.js'

const router = Router()
router.use(verifyJWT)

// Student routes:
router.route('/').post(
  uploadToS3('complaints').single('photo'),
  createComplaint
)
router.route('/my').get(getMyComplaints)
router.route('/:complaintId')
  .delete(deleteComplaint)

// Admin/Staff routes:
router.route('/all')
  .get(isAdminOrStaff, getAllComplaints)
router.route('/analytics')
  .get(isAdminOrStaff,
    getComplaintAnalytics)
router.route('/:complaintId/status')
  .patch(isAdminOrStaff,
    updateComplaintStatus)

export default router
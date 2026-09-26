import { Router } from 'express'
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  confirmResolution,
  getComplaintAnalytics,
  getStaffComplaints,
  deleteComplaint
} from
  '../controllers/complaint.controller.js'
import {
  verifyJWT,
  isAdmin,
  isAdminOrStaff
} from '../middlewares/auth.middleware.js'
import { uploadToS3 } from
  '../config/s3.js'

const router = Router()
router.use(verifyJWT)

// Student:
router.route('/create').post(
  uploadToS3('complaints').single('photo'),
  createComplaint
)
router.route('/my').get(getMyComplaints)
router.route('/:complaintId/confirm')
  .patch(confirmResolution)

// Staff:
router.route('/staff')
  .get(getStaffComplaints)

// Admin:
router.route('/all')
  .get(isAdmin, getAllComplaints)
router.route('/analytics')
  .get(isAdmin, getComplaintAnalytics)
router.route('/:complaintId/status')
  .patch(
    isAdminOrStaff,
    uploadToS3('complaints')
      .single('photo'),
    updateComplaintStatus
  )
router.route('/:complaintId')
  .delete(isAdmin, deleteComplaint)

export default router
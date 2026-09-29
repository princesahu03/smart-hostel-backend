import { Router } from 'express'
import {
  getTeacherProfile,
  getFloorData,
  getAllTeachers,
  assignFloor,
  getWardenHierarchy,
  teacherComplaint,
  updateTeacherProfile,
  getFloorActivity
} from
  '../controllers/teacher.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'
import { uploadToS3 } from
  '../config/s3.js'

const router = Router()
router.use(verifyJWT)

// Teacher routes:
router.route('/profile')
  .get(getTeacherProfile)
  .patch(updateTeacherProfile)

router.route('/floor-data')
  .get(getFloorData)

router.route('/floor-activity')
  .get(getFloorActivity)

router.route('/complaint').post(
  uploadToS3('complaints')
    .single('photo'),
  teacherComplaint
)

// Admin routes:
router.route('/all')
  .get(isAdmin, getAllTeachers)

router.route('/hierarchy')
  .get(isAdmin, getWardenHierarchy)

router.route('/:teacherId/assign-floor')
  .patch(isAdmin, assignFloor)

export default router
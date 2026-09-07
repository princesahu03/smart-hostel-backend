import { Router } from 'express'
import {
  createRoom,
  getAllRooms,
  getRoomById,
  allotRoom,
  removeFromRoom,
  updateRoom,
  getRoomAnalytics
} from '../controllers/room.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'
import { uploadToS3 } from '../config/s3.js'

const router = Router()
router.use(verifyJWT)

// All users:
router.route('/').get(getAllRooms)
router.route('/analytics')
  .get(isAdmin, getRoomAnalytics)
router.route('/:roomId').get(getRoomById)

// Admin only:
router.route('/').post(
  isAdmin,
  uploadToS3('rooms').single('photo'),
  createRoom
)
router.route('/:roomId').patch(
  isAdmin,
  uploadToS3('rooms').single('photo'),
  updateRoom
)
router.route('/:roomId/allot')
  .post(isAdmin, allotRoom)
router.route('/:roomId/remove')
  .post(isAdmin, removeFromRoom)

export default router
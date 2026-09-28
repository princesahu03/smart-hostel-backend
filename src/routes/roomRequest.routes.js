import { Router } from 'express'
import {
  createRoomRequest,
  getMyRequests,
  getAllRequests,
  processRequest,
  cancelRequest,
  getAvailableRooms,
  getStudentsForSwap
} from
  '../controllers/roomRequest.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

// Student:
router.route('/create')
  .post(createRoomRequest)
router.route('/my')
  .get(getMyRequests)
router.route('/available-rooms')
  .get(getAvailableRooms)
router.route('/students-for-swap')
  .get(getStudentsForSwap)
router.route('/:requestId/cancel')
  .patch(cancelRequest)

// Admin:
router.route('/all')
  .get(isAdmin, getAllRequests)
router.route('/:requestId/process')
  .patch(isAdmin, processRequest)

export default router
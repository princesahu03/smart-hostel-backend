import { Router } from 'express'
import {
  createNotice,
  getNotices,
  deleteNotice
} from '../controllers/notice.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

router.route('/')
  .get(getNotices)
  .post(isAdmin, createNotice)

router.route('/:noticeId')
  .delete(isAdmin, deleteNotice)

export default router
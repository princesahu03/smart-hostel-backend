import { Router } from 'express'
import {
  getDepartmentAnalytics,
  getOverallAnalytics,
  getFloorAnalytics
} from
  '../controllers/analytics.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)
router.use(isAdmin)

router.route('/department')
  .get(getDepartmentAnalytics)

router.route('/overall')
  .get(getOverallAnalytics)

router.route('/floor')
  .get(getFloorAnalytics)

export default router
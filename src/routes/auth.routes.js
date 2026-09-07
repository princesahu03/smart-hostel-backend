import { Router } from 'express'
import {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
  uploadDocuments,
  getAllUsers,
  createUser,
  toggleUserStatus
} from '../controllers/auth.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'
import { uploadToS3 } from
  '../config/s3.js'

const router = Router()

// ── Public ──
router.route('/register').post(
  uploadToS3('profiles').single('photo'),
  register
)
router.route('/login').post(login)

// ── Protected ──
router.route('/logout')
  .post(verifyJWT, logout)
router.route('/me')
  .get(verifyJWT, getCurrentUser)
router.route('/change-password')
  .post(verifyJWT, changePassword)
router.route('/update-profile').patch(
  verifyJWT,
  uploadToS3('profiles').single('photo'),
  updateProfile
)
router.route('/upload-documents').post(
  verifyJWT,
  uploadToS3('documents').single('file'),
  uploadDocuments
)

// ── Admin Routes ──
router.route('/users')
  .get(verifyJWT, isAdmin, getAllUsers)
router.route('/create-user')
  .post(verifyJWT, isAdmin, createUser)
router.route('/users/:userId/toggle')
  .patch(verifyJWT, isAdmin,
    toggleUserStatus)

export default router
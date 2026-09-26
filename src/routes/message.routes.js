import { Router } from 'express'
import {
  sendMessage,
  getConversations,
  getMessages,
  sendAnnouncement,
  getUnreadCount,
  getMessageableUsers,
  deleteMessage,
  getAnnouncements
} from
  '../controllers/message.controller.js'
import {
  verifyJWT,
  isAdmin
} from '../middlewares/auth.middleware.js'

const router = Router()
router.use(verifyJWT)

// All users:
router.route('/send').post(sendMessage)
router.route('/conversations')
  .get(getConversations)
router.route('/messages/:userId')
  .get(getMessages)
router.route('/unread').get(getUnreadCount)
router.route('/users').get(getMessageableUsers)
router.route('/announcements')
  .get(getAnnouncements)
router.route('/:messageId')
  .delete(deleteMessage)

// Admin only:
router.route('/announce')
  .post(isAdmin, sendAnnouncement)

export default router
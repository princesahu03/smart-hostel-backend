import { Message } from'../models/message.model.js'
import { Conversation } from'../models/conversation.model.js'
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from'../utils/ApiResponse.js'
import { asyncHandler } from'../utils/asyncHandler.js'

// ── Send Message ──
const sendMessage = asyncHandler(
  async (req, res) => {
    const {
      receiverId, content, type
    } = req.body

    if (!receiverId || !content) {
      throw new ApiError(400,
        "Receiver and content required!")
    }

    const receiver = await
      User.findById(receiverId)
    if (!receiver) {
      throw new ApiError(404,
        "Receiver not found!")
    }

    // Create message:
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content,
      type: type || 'text'
    })

    // Find or create conversation:
    let conversation = await
      Conversation.findOne({
        participants: {
          $all: [
            req.user._id,
            receiverId
          ]
        }
      })

    if (!conversation) {
      conversation = await
        Conversation.create({
          participants: [
            req.user._id,
            receiverId
          ],
          lastMessage: message._id,
          lastMessageAt: new Date(),
          unreadCount: {
            [receiverId.toString()]: 1
          }
        })
    } else {
      // Update conversation:
      conversation.lastMessage =
        message._id
      conversation.lastMessageAt =
        new Date()

      // Increment unread for receiver:
      const receiverUnread =
        conversation.unreadCount.get(
          receiverId.toString()
        ) || 0
      conversation.unreadCount.set(
        receiverId.toString(),
        receiverUnread + 1
      )
      await conversation.save()
    }

    const populated = await
      Message.findById(message._id)
      .populate('sender',
        'name role photo')
      .populate('receiver',
        'name role photo')

    return res.status(201).json(
      new ApiResponse(201, populated,
        "Message sent!")
    )
  }
)

// ── Get Conversations ──
const getConversations = asyncHandler(
  async (req, res) => {
    const conversations = await
      Conversation.find({
        participants: req.user._id
      })
      .populate({
        path: 'participants',
        select: 'name role photo email',
        match: {
          _id: { $ne: req.user._id }
        }
      })
      .populate('lastMessage',
        'content createdAt type isRead')
      .sort({ lastMessageAt: -1 })

    // Format conversations:
    const formatted = conversations.map(c => {
      const otherUser =
        c.participants.find(p =>
          p._id.toString() !==
          req.user._id.toString()
        )

      return {
        _id: c._id,
        otherUser,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount:
          c.unreadCount.get(
            req.user._id.toString()
          ) || 0
      }
    })

    return res.status(200).json(
      new ApiResponse(200, formatted,
        "Conversations fetched!")
    )
  }
)

// ── Get Messages between 2 users ──
const getMessages = asyncHandler(
  async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 30 } =
      req.query

    const skip = (page - 1) * limit

    const messages = await Message.find({
      $or: [
        {
          sender: req.user._id,
          receiver: userId,
          deletedBySender: false
        },
        {
          sender: userId,
          receiver: req.user._id,
          deletedByReceiver: false
        }
      ]
    })
    .populate('sender', 'name role photo')
    .populate('receiver', 'name role photo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

    // Mark as read:
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    )

    // Reset unread count:
    const conversation = await
      Conversation.findOne({
        participants: {
          $all: [req.user._id, userId]
        }
      })

    if (conversation) {
      conversation.unreadCount.set(
        req.user._id.toString(), 0
      )
      await conversation.save()
    }

    return res.status(200).json(
      new ApiResponse(200, {
        messages: messages.reverse(),
        total: messages.length
      }, "Messages fetched!")
    )
  }
)

// ── Send Announcement (Admin) ──
const sendAnnouncement = asyncHandler(
  async (req, res) => {
    const {
      content, targetRole, type
    } = req.body

    if (!content) {
      throw new ApiError(400,
        "Content required!")
    }

    // Find all target users:
    const filter = { isActive: true }
    if (targetRole && targetRole !== 'all') {
      filter.role = targetRole
    } else {
      filter.role = {
        $in: ['student', 'staff', 'security']
      }
    }

    const users = await User.find(filter)
      .select('_id')

    // Create announcement for all:
    const messages = await Promise.all(
      users.map(u =>
        Message.create({
          sender: req.user._id,
          receiver: u._id,
          content,
          type: type || 'announcement',
          isAnnouncement: true,
          targetRole: targetRole || 'all'
        })
      )
    )

    return res.status(201).json(
      new ApiResponse(201, {
        sent: messages.length,
        targetRole: targetRole || 'all'
      }, `Announcement sent to ${messages.length} users!`)
    )
  }
)

// ── Get Unread Count ──
const getUnreadCount = asyncHandler(
  async (req, res) => {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false
    })

    return res.status(200).json(
      new ApiResponse(200, { count },
        "Unread count fetched!")
    )
  }
)

// ── Get All Users to Message ──
const getMessageableUsers = asyncHandler(
  async (req, res) => {
    let filter = { isActive: true }

    // Student can message admin/staff:
    if (req.user.role === 'student') {
      filter.role = {
        $in: ['admin', 'staff']
      }
    }
    // Admin can message all:
    else if (req.user.role === 'admin') {
      filter.role = {
        $in: [
          'student', 'staff', 'security'
        ]
      }
      filter._id = { $ne: req.user._id }
    }
    // Staff can message admin + students:
    else {
      filter.role = {
        $in: ['admin', 'student']
      }
    }

    const users = await User.find(filter)
      .select('name role email photo roomNumber')
      .sort({ role: 1, name: 1 })

    return res.status(200).json(
      new ApiResponse(200, users,
        "Users fetched!")
    )
  }
)

// ── Delete Message ──
const deleteMessage = asyncHandler(
  async (req, res) => {
    const { messageId } = req.params

    const message = await
      Message.findById(messageId)

    if (!message) {
      throw new ApiError(404,
        "Message not found!")
    }

    // Soft delete:
    if (message.sender.toString() ===
        req.user._id.toString()) {
      message.deletedBySender = true
    } else {
      message.deletedByReceiver = true
    }

    await message.save()

    return res.status(200).json(
      new ApiResponse(200, {},
        "Message deleted!")
    )
  }
)

// ── Get Announcements ──
const getAnnouncements = asyncHandler(
  async (req, res) => {
    const announcements = await Message.find({
      receiver: req.user._id,
      isAnnouncement: true
    })
    .populate('sender', 'name role')
    .sort({ createdAt: -1 })
    .limit(20)

    return res.status(200).json(
      new ApiResponse(200, announcements,
        "Announcements fetched!")
    )
  }
)

export {
  sendMessage,
  getConversations,
  getMessages,
  sendAnnouncement,
  getUnreadCount,
  getMessageableUsers,
  deleteMessage,
  getAnnouncements
}
import { RoomRequest } from'../models/roomRequest.model.js'
import { Room } from '../models/room.model.js'
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from'../utils/ApiResponse.js'
import { asyncHandler } from'../utils/asyncHandler.js'

// ── Create Room Request (Student) ──
const createRoomRequest = asyncHandler(
  async (req, res) => {
    const {
      requestType, reason,
      preferredRoomNumber,
      preferredRoommate,
      checkoutDate,
      swapWithStudent,
      swapWithRoom,
      priority
    } = req.body

    if (!requestType || !reason) {
      throw new ApiError(400,
        "Request type and reason required!")
    }

    const student = await User.findById(
      req.user._id
    )

    // Check existing pending:
    const existing = await RoomRequest.findOne({
      student: req.user._id,
      requestType,
      status: 'pending'
    })

    if (existing) {
      throw new ApiError(409,
        `Pending ${requestType} request already exists!`)
    }

    // Find preferred room if given:
    let preferredRoomId = null
    if (preferredRoomNumber) {
      const room = await Room.findOne({
        roomNumber: preferredRoomNumber
      })
      if (room) {
        if (room.occupants.length >=
            room.capacity) {
          throw new ApiError(400,
            `Room ${preferredRoomNumber} is full!`)
        }
        preferredRoomId = room._id
      }
    }

    const request = await RoomRequest.create({
      student: req.user._id,
      requestType,
      currentRoom: student.roomNumber || null,
      preferredRoom: preferredRoomId || null,
      preferredRoomNumber:
        preferredRoomNumber || null,
      preferredRoommate:
        preferredRoommate || null,
      reason,
      checkoutDate: checkoutDate
        ? new Date(checkoutDate) : null,
      swapWithStudent:
        swapWithStudent || null,
      swapWithRoom: swapWithRoom || null,
      priority: priority || 'medium'
    })

    const populated = await
      RoomRequest.findById(request._id)
      .populate('student',
        'name studentId roomNumber')
      .populate('preferredRoom',
        'roomNumber floor type')
      .populate('preferredRoommate',
        'name studentId')

    return res.status(201).json(
      new ApiResponse(201, populated,
        "Room request submitted! ✅")
    )
  }
)

// ── Get My Requests (Student) ──
const getMyRequests = asyncHandler(
  async (req, res) => {
    const requests = await RoomRequest
      .find({ student: req.user._id })
      .populate('preferredRoom',
        'roomNumber floor type amenities')
      .populate('preferredRoommate',
        'name studentId roomNumber')
      .populate('swapWithStudent',
        'name studentId roomNumber')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })

    return res.status(200).json(
      new ApiResponse(200, requests,
        "My requests fetched!")
    )
  }
)

// ── Get All Requests (Admin) ──
const getAllRequests = asyncHandler(
  async (req, res) => {
    const {
      status, requestType,
      page = 1, limit = 20
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (requestType)
      filter.requestType = requestType

    const skip = (page - 1) * limit

    const requests = await RoomRequest
      .find(filter)
      .populate('student',
        'name studentId roomNumber email phone')
      .populate('preferredRoom',
        'roomNumber floor type amenities')
      .populate('preferredRoommate',
        'name studentId roomNumber')
      .populate('swapWithStudent',
        'name studentId roomNumber')
      .populate('processedBy', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await
      RoomRequest.countDocuments(filter)

    return res.status(200).json(
      new ApiResponse(200, {
        requests, total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit)
      }, "Requests fetched!")
    )
  }
)

// ── Process Request (Admin) ──
const processRequest = asyncHandler(
  async (req, res) => {
    const { requestId } = req.params
    const { status, adminRemarks } = req.body

    if (!status) {
      throw new ApiError(400,
        "Status required!")
    }

    const request = await RoomRequest
      .findById(requestId)
      .populate('student')
      .populate('preferredRoom')
      .populate('swapWithStudent')

    if (!request) {
      throw new ApiError(404,
        "Request not found!")
    }

    // Execute action if approving:
    if (status === 'approved' ||
        status === 'completed') {

      // ── Room Change ──
      if (request.requestType ===
          'room_change' &&
          request.preferredRoom) {

        // Remove from old room:
        if (request.currentRoom) {
          const oldRoom = await Room.findOne({
            roomNumber: request.currentRoom
          })

          if (oldRoom) {
            oldRoom.occupants =
              oldRoom.occupants.filter(
                id => id.toString() !==
                  request.student._id.toString()
              )

            if (oldRoom.occupants.length <
                oldRoom.capacity) {
              oldRoom.status = 'available'
            }

            await oldRoom.save()
          }
        }

        // Add to new room:
        const newRoom = await Room.findById(
          request.preferredRoom._id
        )

        if (newRoom &&
            newRoom.occupants.length <
            newRoom.capacity) {

          newRoom.occupants.push(
            request.student._id
          )

          if (newRoom.occupants.length >=
              newRoom.capacity) {
            newRoom.status = 'full'
          }

          await newRoom.save()

          await User.findByIdAndUpdate(
            request.student._id,
            { roomNumber: newRoom.roomNumber }
          )
        }

        request.status = 'completed'
      }

      // ── Room Checkout ──
      else if (request.requestType ===
               'room_checkout') {

        const student = await User.findById(
          request.student._id
        )

        if (student && student.roomNumber) {
          const currentRoom = await
            Room.findOne({
              roomNumber: student.roomNumber
            })

          if (currentRoom) {
            currentRoom.occupants =
              currentRoom.occupants.filter(
                id => id.toString() !==
                  student._id.toString()
              )
            currentRoom.status = 'available'
            await currentRoom.save()
          }

          await User.findByIdAndUpdate(
            student._id,
            { roomNumber: null }
          )
        }

        request.status = 'completed'
      }

      // ── Room Swap ──
      else if (request.requestType ===
               'room_swap' &&
               request.swapWithStudent) {

        const student1 = await User.findById(
          request.student._id
        )

        const swapId =
          request.swapWithStudent._id ||
          request.swapWithStudent

        const student2 = await
          User.findById(swapId)

        if (student1 && student2 &&
            student1.roomNumber &&
            student2.roomNumber) {

          const room1 = student1.roomNumber
          const room2 = student2.roomNumber

          // Swap student rooms:
          await User.findByIdAndUpdate(
            student1._id,
            { roomNumber: room2 }
          )

          await User.findByIdAndUpdate(
            student2._id,
            { roomNumber: room1 }
          )

          // Update room occupants:
          const roomDoc1 = await Room.findOne({
            roomNumber: room1
          })

          const roomDoc2 = await Room.findOne({
            roomNumber: room2
          })

          if (roomDoc1) {
            roomDoc1.occupants =
              roomDoc1.occupants.map(id =>
                id.toString() ===
                student1._id.toString()
                  ? student2._id : id
              )
            await roomDoc1.save()
          }

          if (roomDoc2) {
            roomDoc2.occupants =
              roomDoc2.occupants.map(id =>
                id.toString() ===
                student2._id.toString()
                  ? student1._id : id
              )
            await roomDoc2.save()
          }
        }

        request.status = 'completed'
      }

      // ── Other types ──
      else {
        request.status = status
      }

    } else {
      // Rejected or cancelled:
      request.status = status
    }

    request.adminRemarks =
      adminRemarks || null
    request.processedBy = req.user._id
    request.processedAt = new Date()

    await request.save()

    const populated = await
      RoomRequest.findById(request._id)
      .populate('student',
        'name email roomNumber')
      .populate('preferredRoom', 'roomNumber')
      .populate('processedBy', 'name')

    return res.status(200).json(
      new ApiResponse(200, populated,
        `Request ${request.status}!`)
    )
  }
)

// ── Cancel Request (Student) ──
const cancelRequest = asyncHandler(
  async (req, res) => {
    const { requestId } = req.params

    const request = await
      RoomRequest.findById(requestId)

    if (!request) {
      throw new ApiError(404,
        "Request not found!")
    }

    if (request.student.toString() !==
        req.user._id.toString()) {
      throw new ApiError(403,
        "Not your request!")
    }

    if (request.status !== 'pending') {
      throw new ApiError(400,
        "Can only cancel pending requests!")
    }

    request.status = 'cancelled'
    await request.save()

    return res.status(200).json(
      new ApiResponse(200, request,
        "Request cancelled!")
    )
  }
)

// ── Get Available Rooms ──
const getAvailableRooms = asyncHandler(
  async (req, res) => {
    const rooms = await Room.find({
      status: 'available'
    })
    .populate('occupants', 'name studentId')
    .sort({ floor: 1, roomNumber: 1 })

    return res.status(200).json(
      new ApiResponse(200, rooms,
        "Available rooms fetched!")
    )
  }
)

// ── Get Students for Swap ──
const getStudentsForSwap = asyncHandler(
  async (req, res) => {
    const students = await User.find({
      role: 'student',
      isActive: true,
      roomNumber: { $ne: null },
      _id: { $ne: req.user._id }
    })
    .select(
      'name studentId roomNumber course year'
    )
    .sort({ roomNumber: 1 })

    return res.status(200).json(
      new ApiResponse(200, students,
        "Students fetched!")
    )
  }
)

export {
  createRoomRequest,
  getMyRequests,
  getAllRequests,
  processRequest,
  cancelRequest,
  getAvailableRooms,
  getStudentsForSwap
}
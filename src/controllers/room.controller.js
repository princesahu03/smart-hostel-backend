import { Room } from '../models/room.model.js'
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from
  '../utils/ApiResponse.js'
import { asyncHandler } from
  '../utils/asyncHandler.js'

// ── Create Room (Admin) ──
const createRoom = asyncHandler(
  async (req, res) => {
    const {
      roomNumber, floor, block,
      type, capacity, amenities,
      monthlyRent
    } = req.body

    if (!roomNumber || !floor || !capacity) {
      throw new ApiError(400,
        "Room number, floor, capacity required!")
    }

    // Already exists:
    const existingRoom = await Room.findOne({
      roomNumber
    })
    if (existingRoom) {
      throw new ApiError(409,
        "Room number already exists!")
    }

    // Photo S3 URL:
    const photo = req.file
      ? req.file.location
      : null

    const room = await Room.create({
      roomNumber,
      floor: Number(floor),
      block: block || 'A',
      type: type || 'double',
      capacity: Number(capacity),
      amenities: amenities
        ? JSON.parse(amenities)
        : [],
      monthlyRent: Number(monthlyRent) || 0,
      photo
    })

    return res.status(201).json(
      new ApiResponse(201, room,
        "Room created successfully!")
    )
  }
)

// ── Get All Rooms ──
const getAllRooms = asyncHandler(
  async (req, res) => {
    const {
      status, type,
      floor, block
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (type) filter.type = type
    if (floor) filter.floor = Number(floor)
    if (block) filter.block = block

    const rooms = await Room.find(filter)
      .populate('occupants',
        'name email studentId photo')
      .sort({ floor: 1, roomNumber: 1 })

    // Add occupancy info:
    const roomsWithOccupancy = rooms.map(
      room => ({
        ...room.toObject(),
        currentOccupancy: room.occupants.length,
        availableSlots:
          room.capacity - room.occupants.length
      })
    )

    return res.status(200).json(
      new ApiResponse(200, {
        rooms: roomsWithOccupancy,
        total: rooms.length,
        available: rooms.filter(
          r => r.status === 'available'
        ).length,
        full: rooms.filter(
          r => r.status === 'full'
        ).length
      }, "Rooms fetched!")
    )
  }
)

// ── Get Single Room ──
const getRoomById = asyncHandler(
  async (req, res) => {
    const { roomId } = req.params

    const room = await Room.findById(roomId)
      .populate('occupants',
        'name email phone studentId photo course year')

    if (!room) {
      throw new ApiError(404,
        "Room not found!")
    }

    return res.status(200).json(
      new ApiResponse(200, room,
        "Room fetched!")
    )
  }
)

// ── Allot Room to Student ──
const allotRoom = asyncHandler(
  async (req, res) => {
    const { roomId } = req.params
    const { studentId } = req.body

    if (!studentId) {
      throw new ApiError(400,
        "Student ID required!")
    }

    // Find room:
    const room = await Room.findById(roomId)
    if (!room) {
      throw new ApiError(404,
        "Room not found!")
    }

    // Room full check:
    if (room.occupants.length >= room.capacity) {
      throw new ApiError(400,
        "Room is full!")
    }

    if (room.status === 'maintenance') {
      throw new ApiError(400,
        "Room is under maintenance!")
    }

    // Find student:
    const student = await User.findById(
      studentId
    )
    if (!student) {
      throw new ApiError(404,
        "Student not found!")
    }

    if (student.role !== 'student') {
      throw new ApiError(400,
        "Only students can be allotted rooms!")
    }

    // Already has room:
    if (student.roomNumber) {
      throw new ApiError(400,
        `Student already has room: 
        ${student.roomNumber}!`)
    }

    // Already in this room:
    if (room.occupants.includes(studentId)) {
      throw new ApiError(400,
        "Student already in this room!")
    }

    // Add student to room:
    room.occupants.push(studentId)

    // Update status if full:
    if (room.occupants.length >= room.capacity) {
      room.status = 'full'
    }

    await room.save()

    // Update student room:
    await User.findByIdAndUpdate(
      studentId,
      { roomNumber: room.roomNumber }
    )

    const updatedRoom = await
      Room.findById(roomId)
      .populate('occupants',
        'name email studentId')

    return res.status(200).json(
      new ApiResponse(200, updatedRoom,
        `Room ${room.roomNumber} allotted 
        to ${student.name}!`)
    )
  }
)

// ── Remove Student from Room ──
const removeFromRoom = asyncHandler(
  async (req, res) => {
    const { roomId } = req.params
    const { studentId } = req.body

    if (!studentId) {
      throw new ApiError(400,
        "Student ID required!")
    }

    const room = await Room.findById(roomId)
    if (!room) {
      throw new ApiError(404,
        "Room not found!")
    }

    // Check student in room:
    if (!room.occupants.includes(studentId)) {
      throw new ApiError(400,
        "Student not in this room!")
    }

    // Remove student:
    room.occupants = room.occupants.filter(
      id => id.toString() !== studentId
    )

    // Update status:
    if (room.occupants.length < room.capacity) {
      room.status = 'available'
    }

    await room.save()

    // Clear student room:
    await User.findByIdAndUpdate(
      studentId,
      { roomNumber: null }
    )

    return res.status(200).json(
      new ApiResponse(200, room,
        "Student removed from room!")
    )
  }
)

// ── Update Room ──
const updateRoom = asyncHandler(
  async (req, res) => {
    const { roomId } = req.params
    const {
      status, amenities,
      monthlyRent, block
    } = req.body

    const updateData = {}
    if (status) updateData.status = status
    if (monthlyRent)
      updateData.monthlyRent =
        Number(monthlyRent)
    if (block) updateData.block = block
    if (amenities)
      updateData.amenities =
        JSON.parse(amenities)
    if (req.file)
      updateData.photo = req.file.location

    const room = await
      Room.findByIdAndUpdate(
        roomId,
        { $set: updateData },
        { new: true }
      ).populate('occupants', 'name email')

    if (!room) {
      throw new ApiError(404,
        "Room not found!")
    }

    return res.status(200).json(
      new ApiResponse(200, room,
        "Room updated!")
    )
  }
)

// ── Room Analytics (Admin) ──
const getRoomAnalytics = asyncHandler(
  async (req, res) => {
    const totalRooms =
      await Room.countDocuments()

    const byStatus = await Room.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    const byType = await Room.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalCapacity: {
            $sum: "$capacity"
          }
        }
      }
    ])

    const byFloor = await Room.aggregate([
      {
        $group: {
          _id: "$floor",
          rooms: { $sum: 1 },
          occupants: {
            $sum: { $size: "$occupants" }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])

    return res.status(200).json(
      new ApiResponse(200, {
        totalRooms,
        byStatus,
        byType,
        byFloor
      }, "Room analytics fetched!")
    )
  }
)

export {
  createRoom,
  getAllRooms,
  getRoomById,
  allotRoom,
  removeFromRoom,
  updateRoom,
  getRoomAnalytics
}
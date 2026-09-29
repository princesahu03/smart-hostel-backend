import { User } from '../models/user.model.js'
import { Complaint } from'../models/complaint.model.js'
import { Room } from '../models/room.model.js'
import { QREntry } from'../models/qrEntry.model.js'
import { CurfewViolation } from'../models/curfewViolation.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from'../utils/ApiResponse.js'
import { asyncHandler } from'../utils/asyncHandler.js'

// ── Get Teacher Profile ──
const getTeacherProfile = asyncHandler(
  async (req, res) => {
    const teacher = await User.findById(
      req.user._id
    ).select('-password -refreshToken')

    return res.status(200).json(
      new ApiResponse(200, teacher,
        "Profile fetched!")
    )
  }
)

// ── Get Floor Data (Floor Warden) ──
const getFloorData = asyncHandler(
  async (req, res) => {
    const teacher = await User.findById(
      req.user._id
    )

    if (!teacher.assignedFloor) {
      throw new ApiError(400,
        "No floor assigned!")
    }

    const floor = teacher.assignedFloor

    // Get rooms on this floor:
    const rooms = await Room.find({
      floor
    })
    .populate('occupants',
      'name studentId email phone course year')
    .sort({ roomNumber: 1 })

    // Get students on this floor:
    const roomNumbers = rooms.map(
      r => r.roomNumber
    )
    const students = await User.find({
      role: 'student',
      isActive: true,
      roomNumber: { $in: roomNumbers }
    }).select(
      'name studentId email phone course year roomNumber currentStatus curfewViolations'
    )

    // Floor stats:
    const totalRooms = rooms.length
    const occupiedRooms = rooms.filter(
      r => r.occupants.length > 0
    ).length
    const totalStudents = students.length
    const insideCount = students.filter(
      s => s.currentStatus === 'inside'
    ).length

    // Curfew violations on this floor:
    const studentIds = students.map(
      s => s._id
    )
    const violations = await
      CurfewViolation.find({
        student: { $in: studentIds },
        status: 'pending'
      })
      .populate('student',
        'name roomNumber')
      .sort({ createdAt: -1 })
      .limit(10)

    // Pending complaints on this floor:
    const complaints = await
      Complaint.find({
        roomNumber: { $in: roomNumbers },
        status: {
          $in: ['pending', 'assigned']
        }
      })
      .populate('student', 'name')
      .sort({ priority: -1 })
      .limit(10)

    return res.status(200).json(
      new ApiResponse(200, {
        floor,
        rooms,
        students,
        stats: {
          totalRooms,
          occupiedRooms,
          availableRooms:
            totalRooms - occupiedRooms,
          totalStudents,
          insideCount,
          outsideCount:
            totalStudents - insideCount
        },
        violations,
        complaints
      }, `Floor ${floor} data fetched!`)
    )
  }
)

// ── Get All Teachers (Admin) ──
const getAllTeachers = asyncHandler(
  async (req, res) => {
    const teachers = await User.find({
      role: 'teacher',
      isActive: true
    })
    .select('-password -refreshToken')
    .sort({ assignedFloor: 1 })

    return res.status(200).json(
      new ApiResponse(200, teachers,
        "Teachers fetched!")
    )
  }
)

// ── Assign Floor to Teacher (Admin) ──
const assignFloor = asyncHandler(
  async (req, res) => {
    const { teacherId } = req.params
    const {
      assignedFloor,
      wardenLevel,
      designation
    } = req.body

    const teacher = await
      User.findById(teacherId)

    if (!teacher) {
      throw new ApiError(404,
        "Teacher not found!")
    }

    if (teacher.role !== 'teacher') {
      throw new ApiError(400,
        "User is not a teacher!")
    }

    // Check floor already assigned:
    if (assignedFloor) {
      const existing = await User.findOne({
        role: 'teacher',
        assignedFloor:
          parseInt(assignedFloor),
        _id: { $ne: teacherId }
      })

      if (existing) {
        throw new ApiError(409,
          `Floor ${assignedFloor} already ` +
          `assigned to ${existing.name}!`)
      }
    }

    teacher.assignedFloor =
      assignedFloor
        ? parseInt(assignedFloor)
        : null
    teacher.wardenLevel =
      wardenLevel || null
    teacher.designation =
      designation || teacher.designation

    await teacher.save()

    return res.status(200).json(
      new ApiResponse(200, teacher,
        "Floor assigned! ✅")
    )
  }
)

// ── Get Warden Hierarchy (Admin) ──
const getWardenHierarchy = asyncHandler(
  async (req, res) => {
    const wardens = await User.find({
      role: 'teacher',
      wardenLevel: { $ne: null }
    })
    .select(
      'name email phone designation ' +
      'wardenLevel assignedFloor ' +
      'teacherId officeHours'
    )
    .sort({ wardenLevel: 1 })

    // Group by level:
    const chiefWarden = wardens.filter(
      w => w.wardenLevel === 'chief_warden'
    )
    const hostelWardens = wardens.filter(
      w => w.wardenLevel === 'hostel_warden'
    )
    const floorWardens = wardens.filter(
      w => w.wardenLevel === 'floor_warden'
    )

    return res.status(200).json(
      new ApiResponse(200, {
        chiefWarden,
        hostelWardens,
        floorWardens,
        total: wardens.length
      }, "Hierarchy fetched!")
    )
  }
)

// ── Teacher Submit Complaint ──
const teacherComplaint = asyncHandler(
  async (req, res) => {
    const {
      title, description, category, priority
    } = req.body

    if (!title || !description ||
        !category) {
      throw new ApiError(400,
        "All fields required!")
    }

    const complaint = await
      Complaint.create({
        student: req.user._id,
        category,
        title,
        description,
        priority: priority || 'medium',
        photo: req.file?.location || null,
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          updatedBy: req.user._id,
          remark:
            'Complaint by teacher/warden',
          updatedAt: new Date()
        }]
      })

    return res.status(201).json(
      new ApiResponse(201, complaint,
        "Complaint submitted! ✅")
    )
  }
)

// ── Update Teacher Profile ──
const updateTeacherProfile = asyncHandler(
  async (req, res) => {
    const {
      designation, subject,
      officeHours, officeRoom, phone
    } = req.body

    const teacher = await User.findById(
      req.user._id
    )

    if (designation)
      teacher.designation = designation
    if (subject)
      teacher.subject = subject
    if (officeHours)
      teacher.officeHours = officeHours
    if (officeRoom)
      teacher.officeRoom = officeRoom
    if (phone)
      teacher.phone = phone

    await teacher.save()

    return res.status(200).json(
      new ApiResponse(200, teacher,
        "Profile updated! ✅")
    )
  }
)

// ── Get Floor Students Activity ──
const getFloorActivity = asyncHandler(
  async (req, res) => {
    const teacher = await User.findById(
      req.user._id
    )

    if (!teacher.assignedFloor) {
      throw new ApiError(400,
        "No floor assigned!")
    }

    const floor = teacher.assignedFloor

    // Get rooms on floor:
    const rooms = await Room.find({ floor })
    const roomNumbers = rooms.map(
      r => r.roomNumber
    )

    // Get students:
    const students = await User.find({
      role: 'student',
      roomNumber: { $in: roomNumbers }
    }).select('_id name roomNumber')

    const studentIds = students.map(
      s => s._id
    )

    // Today's QR activity:
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayEntries = await
      QREntry.find({
        student: { $in: studentIds },
        scanTime: {
          $gte: today,
          $lt: tomorrow
        }
      })
      .populate('student',
        'name roomNumber')
      .sort({ scanTime: -1 })

    // Late entries:
    const lateEntries =
      todayEntries.filter(e => e.isLate)

    // All violations:
    const allViolations = await
      CurfewViolation.find({
        student: { $in: studentIds }
      })
      .populate('student',
        'name roomNumber')
      .sort({ createdAt: -1 })
      .limit(20)

    return res.status(200).json(
      new ApiResponse(200, {
        todayEntries,
        lateEntries,
        allViolations,
        totalStudents: students.length
      }, "Activity fetched!")
    )
  }
)

export {
  getTeacherProfile,
  getFloorData,
  getAllTeachers,
  assignFloor,
  getWardenHierarchy,
  teacherComplaint,
  updateTeacherProfile,
  getFloorActivity
}
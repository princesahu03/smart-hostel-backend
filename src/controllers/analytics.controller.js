import { User } from '../models/user.model.js'
import { Room } from '../models/room.model.js'
import { Complaint } from'../models/complaint.model.js'
import { Visitor } from'../models/visitor.model.js'
import { QREntry } from'../models/qrEntry.model.js'
import { ApiResponse } from'../utils/ApiResponse.js'
import { asyncHandler } from'../utils/asyncHandler.js'

// ── Department wise Students ──
const getDepartmentAnalytics = asyncHandler(
  async (req, res) => {

    // Course wise count:
    const courseWise = await User.aggregate([
      {
        $match: {
          role: 'student',
          isActive: true
        }
      },
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Department wise count:
    const deptWise = await User.aggregate([
      {
        $match: {
          role: 'student',
          isActive: true,
          department: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Gender wise count:
    const genderWise = await User.aggregate([
      {
        $match: {
          role: 'student',
          isActive: true
        }
      },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ])

    // Year wise count:
    const yearWise = await User.aggregate([
      {
        $match: {
          role: 'student',
          isActive: true,
          year: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Total counts:
    const totalStudents =
      await User.countDocuments({
        role: 'student',
        isActive: true
      })

    const totalBoys =
      await User.countDocuments({
        role: 'student',
        gender: 'male',
        isActive: true
      })

    const totalGirls =
      await User.countDocuments({
        role: 'student',
        gender: 'female',
        isActive: true
      })

    // Room occupancy:
    const roomStats = await Room.aggregate([
      {
        $group: {
          _id: '$floor',
          totalRooms: { $sum: 1 },
          totalCapacity: {
            $sum: '$capacity'
          },
          totalOccupants: {
            $sum: { $size: '$occupants' }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Students without room:
    const studentsWithoutRoom =
      await User.countDocuments({
        role: 'student',
        isActive: true,
        roomNumber: null
      })

    // Current inside/outside:
    const insideCount =
      await User.countDocuments({
        role: 'student',
        isActive: true,
        currentStatus: 'inside'
      })

    return res.status(200).json(
      new ApiResponse(200, {
        totalStudents,
        totalBoys,
        totalGirls,
        studentsWithoutRoom,
        insideCount,
        outsideCount: totalStudents
          - insideCount,
        courseWise,
        deptWise,
        genderWise,
        yearWise,
        roomStats
      }, "Analytics fetched!")
    )
  }
)

// ── Overall Hostel Analytics ──
const getOverallAnalytics = asyncHandler(
  async (req, res) => {

    // All counts parallel:
    const [
      totalStudents,
      totalRooms,
      availableRooms,
      fullRooms,
      pendingComplaints,
      resolvedComplaints,
      todayVisitors,
      totalStaff
    ] = await Promise.all([
      User.countDocuments({
        role: 'student',
        isActive: true
      }),
      Room.countDocuments(),
      Room.countDocuments({
        status: 'available'
      }),
      Room.countDocuments({
        status: 'full'
      }),
      Complaint.countDocuments({
        status: 'pending'
      }),
      Complaint.countDocuments({
        status: 'resolved'
      }),
      (() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(
          tomorrow.getDate() + 1
        )
        return Visitor.countDocuments({
          visitDate: {
            $gte: today,
            $lt: tomorrow
          }
        })
      })(),
      User.countDocuments({
        role: { $in: ['staff', 'security'] },
        isActive: true
      })
    ])

    // Monthly complaint trend:
    const complaintTrend =
      await Complaint.aggregate([
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            '_id.year': -1,
            '_id.month': -1
          }
        },
        { $limit: 6 }
      ])

    // Complaint by category:
    const complaintByCategory =
      await Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])

    // Today entry/exit stats:
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayEntries =
      await QREntry.countDocuments({
        type: 'entry',
        scanTime: {
          $gte: today,
          $lt: tomorrow
        }
      })

    const todayLateEntries =
      await QREntry.countDocuments({
        type: 'entry',
        isLate: true,
        scanTime: {
          $gte: today,
          $lt: tomorrow
        }
      })

    return res.status(200).json(
      new ApiResponse(200, {
        totalStudents,
        totalRooms,
        availableRooms,
        fullRooms,
        pendingComplaints,
        resolvedComplaints,
        todayVisitors,
        totalStaff,
        todayEntries,
        todayLateEntries,
        complaintTrend,
        complaintByCategory
      }, "Overall analytics fetched!")
    )
  }
)

// ── Floor wise Occupancy ──
const getFloorAnalytics = asyncHandler(
  async (req, res) => {
    const floorData = await Room.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'occupants',
          foreignField: '_id',
          as: 'occupantDetails'
        }
      },
      {
        $group: {
          _id: '$floor',
          rooms: { $sum: 1 },
          totalCapacity: {
            $sum: '$capacity'
          },
          occupied: {
            $sum: {
              $size: '$occupants'
            }
          },
          maleStudents: {
            $sum: {
              $size: {
                $filter: {
                  input: '$occupantDetails',
                  as: 'occ',
                  cond: {
                    $eq: ['$$occ.gender', 'male']
                  }
                }
              }
            }
          },
          femaleStudents: {
            $sum: {
              $size: {
                $filter: {
                  input: '$occupantDetails',
                  as: 'occ',
                  cond: {
                    $eq: [
                      '$$occ.gender', 'female'
                    ]
                  }
                }
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])

    return res.status(200).json(
      new ApiResponse(200, floorData,
        "Floor analytics fetched!")
    )
  }
)

export {
  getDepartmentAnalytics,
  getOverallAnalytics,
  getFloorAnalytics
}
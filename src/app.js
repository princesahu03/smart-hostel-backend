// ── All Routes Import ──

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { errorHandler } from'./middlewares/error.middleware.js'
import authRoutes from'./routes/auth.routes.js'
import roomRoutes from'./routes/room.routes.js'
import complaintRoutes from'./routes/complaint.routes.js'
import visitorRoutes from'./routes/visitor.routes.js'
import noticeRoutes from'./routes/notice.routes.js'
import qrRoutes from './routes/qr.routes.js'

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT','DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie'
  ]
}))

app.options('/{*path}', cors())

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({
  extended: true,
  limit: '16kb'
}))
app.use(cookieParser())

// ── Health Check ──
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "🏠 Hostel API Running!",
    timestamp: new Date().toISOString()
  })
})

// ── All Routes ──
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/complaints', complaintRoutes)
app.use('/api/v1/visitors', visitorRoutes)
app.use('/api/v1/notices', noticeRoutes)
app.use('/api/v1/qr', qrRoutes)

// ── 404 ──
app.use('/{*path}', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl}
      not found!`
  })
})

// ── Error Handler ──
app.use(errorHandler)

export { app }
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import { app } from './app.js'

dotenv.config({ path: './.env' })

const PORT = process.env.PORT || 8000

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`
🏠 Smart Hostel Server Running!
🌐 Port: ${PORT}
📦 Environment: ${process.env.NODE_ENV}
      `)
    })
  })
  .catch((err) => {
    console.log(
      "MongoDB connection failed!", err
    )
  })
import AWS from 'aws-sdk'
import multer from 'multer'
import multerS3 from 'multer-s3'
import { v4 as uuidv4 } from 'uuid'
import "dotenv/config";

// AWS Config:
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
})

export const s3 = new AWS.S3()

// File type check:
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf'
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(
      'Only JPG, PNG, PDF allowed!'
    ), false)
  }
}

// Upload to S3:
export const uploadToS3 = (folder = 'uploads') =>
  multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: 'public-read',
      metadata: (req, file, cb) => {
        cb(null, {
          fieldName: file.fieldname,
          uploadedBy: req.user?._id
            ?.toString() || 'unknown'
        })
      },
      key: (req, file, cb) => {
        // Unique filename:
        const ext = file.originalname
          .split('.').pop()
        const fileName =
          `${folder}/${uuidv4()}.${ext}`
        cb(null, fileName)
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter
  })

// Delete from S3:
export const deleteFromS3 = async (fileUrl) => {
  try {
    if (!fileUrl) return false

    // Extract key from URL:
    const urlParts = fileUrl.split('/')
    const key = urlParts
      .slice(3).join('/')

    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }).promise()

    return true
  } catch (error) {
    console.error('S3 Delete Error:', error)
    return false
  }
}
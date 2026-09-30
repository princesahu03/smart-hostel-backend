import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const fixIndexes = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    )
    console.log('✅ Connected to MongoDB!')

    const collection =
      mongoose.connection.collection('users')

    // Get all indexes:
    const indexes = await
      collection.indexes()
    console.log('Current indexes:',
      indexes.map(i => i.name))

    // Drop problematic indexes:
    const toDrop = [
      'qrCode_1',
      'teacherId_1'
    ]

    for (const indexName of toDrop) {
      try {
        await collection.dropIndex(indexName)
        console.log(`✅ Dropped: ${indexName}`)
      } catch (err) {
        console.log(
          `ℹ️ ${indexName}: ${err.message}`
        )
      }
    }

    console.log('✅ All done!')
    await mongoose.disconnect()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

fixIndexes()
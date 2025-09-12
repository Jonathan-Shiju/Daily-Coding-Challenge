import mongoose from 'mongoose'

// Cache the connection
let cachedDb = null

const MONGODB_URI = process.env.MONGO_URI

export async function connectToDatabase() {
  if (cachedDb) {
    console.log('Using cached database connection')
    return cachedDb
  }

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env'
    )
  }

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    cachedDb = db
    console.log('New database connection established')
    return cachedDb
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
}

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

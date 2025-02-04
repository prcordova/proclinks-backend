import mongoose, { Schema, Document } from 'mongoose'

export interface ILink extends Document {
  title: string
  url: string
  visible: boolean
  order: number
  likes: number
  userId: string
  createdAt: Date
  updatedAt: Date
}

const linkSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

const Link = mongoose.model<ILink>('Link', linkSchema)
export default Link 
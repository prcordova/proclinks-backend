import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id
      return ret
    }
  }
})

// Índices para melhorar a performance das consultas
messageSchema.index({ senderId: 1, recipientId: 1 })
messageSchema.index({ timestamp: -1 })

// Virtual populate para informações do remetente
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
})

// Virtual populate para informações do destinatário
messageSchema.virtual('recipient', {
  ref: 'User',
  localField: 'recipientId',
  foreignField: '_id',
  justOne: true
})

export interface IMessage extends mongoose.Document {
  senderId: mongoose.Types.ObjectId
  recipientId: mongoose.Types.ObjectId
  content: string
  timestamp: Date
  read: boolean
  sender?: {
    _id: string
    username: string
    avatar?: string
  }
  recipient?: {
    _id: string
    username: string
    avatar?: string
  }
}

export const Message = mongoose.model<IMessage>('Message', messageSchema)
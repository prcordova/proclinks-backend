import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  profile: {
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    cardColor: {
      type: String,
      default: '#f5f5f5'
    },
    textColor: {
      type: String,
      default: '#000000'
    },
    cardTextColor: {
      type: String,
      default: '#000000'
    },
    displayMode: {
      type: String,
      enum: ['list', 'grid'],
      default: 'list'
    },
    cardStyle: {
      type: String,
      enum: ['rounded', 'square', 'pill'],
      default: 'rounded'
    },
    animation: {
      type: String,
      enum: ['none', 'fade', 'slide', 'bounce'],
      default: 'none'
    },
    font: {
      type: String,
      enum: ['default', 'serif', 'mono'],
      default: 'default'
    },
    spacing: {
      type: Number,
      default: 16,
      min: 8,
      max: 32
    },
    sortMode: {
      type: String,
      enum: ['custom', 'date', 'name', 'likes'],
      default: 'custom'
    },
    likesColor: {
      type: String,
      default: '#ff0000'
    }
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  viewMode: {
    type: String,
    enum: ['list', 'grid'],
    default: 'grid',
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
})

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

export const User = mongoose.model('User', userSchema) 
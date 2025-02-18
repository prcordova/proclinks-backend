import mongoose from 'mongoose'

export enum FriendshipStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  FRIENDLY = 'FRIENDLY'
}

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(FriendshipStatus),
    default: FriendshipStatus.NONE
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Índice composto para evitar duplicatas
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true })

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  avatar?: string;
  bio?: string;
}

export interface IFriendship extends mongoose.Document {
  requester: string | PopulatedUser;
  recipient: string | PopulatedUser;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const Friendship = mongoose.model<IFriendship>('Friendship', friendshipSchema) 
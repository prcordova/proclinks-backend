import { Schema, model } from 'mongoose'

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

const paymentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planType: {
    type: String,
    enum: UserPlanType,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'BRL'
  },
  status: {
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  },
  stripePaymentId: {
    type: String,
    required: true
  },
  stripeSessionId: {
    type: String,
    required: true
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

export const Payment = model('Payment', paymentSchema) 
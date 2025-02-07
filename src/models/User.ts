import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { PlanType, PlanStatus } from './Plans'

export enum UserPlanType {
  FREE = 'FREE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD'
}

interface IPlan {
  type: PlanType;
  status: PlanStatus;
  startDate: Date | null;
  expirationDate: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

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
    ref: 'User',
    default: []
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  plan: {
    type: {
      type: String,
      enum: Object.values(PlanType),
      default: PlanType.FREE
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.ACTIVE
    },
    startDate: {
      type: Date,
      default: null
    },
    expirationDate: {
      type: Date,
      default: null
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    }
  },
  cpf: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(cpf: string) {
        // Remove caracteres não numéricos
        const cleanCpf = cpf.replace(/\D/g, '')
        
        // Verifica se tem 11 dígitos
        if (cleanCpf.length !== 11) return false

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cleanCpf)) return false

        // Validação dos dígitos verificadores
        let sum = 0
        let rest
        
        for (let i = 1; i <= 9; i++) 
          sum = sum + parseInt(cleanCpf.substring(i-1, i)) * (11 - i)
        
        rest = (sum * 10) % 11
        if ((rest === 10) || (rest === 11)) rest = 0
        if (rest !== parseInt(cleanCpf.substring(9, 10))) return false

        sum = 0
        for (let i = 1; i <= 10; i++) 
          sum = sum + parseInt(cleanCpf.substring(i-1, i)) * (12 - i)
        
        rest = (sum * 10) % 11
        if ((rest === 10) || (rest === 11)) rest = 0
        if (rest !== parseInt(cleanCpf.substring(10, 11))) return false

        return true
      },
      message: 'CPF inválido'
    }
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(phone: string) {
        const cleanPhone = phone.replace(/\D/g, '')
        return /^[1-9]{2}[9]?[0-9]{8}$/.test(cleanPhone)
      },
      message: 'Telefone inválido'
    }
  }
})

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// Definir interface para o documento do usuário
export interface IUser extends mongoose.Document {
  username: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: string | null;
  profile: any; // você pode definir uma interface específica para profile
  isPublic: boolean;
  createdAt: Date;
  viewMode: string;
  followers: string[];
  following: string[];
  followersCount: number;
  followingCount: number;
  plan: IPlan;
  cpf: string;
  phone: string;
}

export const User = mongoose.model<IUser>('User', userSchema) 
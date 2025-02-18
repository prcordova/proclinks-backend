import { Request, Response } from 'express'
import { Friendship, FriendshipStatus } from '../models/Friendship'
import { User } from '../models/User'
import mongoose from 'mongoose'

interface AuthRequest extends Request {
  user: {
    id: string;
  };
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  avatar?: string;
  bio?: string;
}

interface IFriendship extends mongoose.Document {
  requester: string | PopulatedUser;
  recipient: string | PopulatedUser;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class FriendshipController {
  // Enviar solicitação de amizade
  public async sendFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const requesterId = req.user.id
      const { recipientId } = req.body

      // Verifica se não está tentando adicionar a si mesmo
      if (requesterId === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode enviar solicitação de amizade para si mesmo'
        })
      }

      // Verifica se o destinatário existe
      const recipientExists = await User.exists({ _id: recipientId })
      if (!recipientExists) {
        return res.status(404).json({
          success: false,
          message: 'Usuário destinatário não encontrado'
        })
      }

      // Verifica se já existe uma solicitação
      const existingFriendship = await Friendship.findOne({
        $or: [
          { requester: requesterId, recipient: recipientId },
          { requester: recipientId, recipient: requesterId }
        ]
      })

      if (existingFriendship) {
        if (existingFriendship.status === FriendshipStatus.FRIENDLY) {
          return res.status(400).json({
            success: false,
            message: 'Vocês já são amigos'
          })
        }
        if (existingFriendship.status === FriendshipStatus.PENDING) {
          return res.status(400).json({
            success: false,
            message: 'Já existe uma solicitação de amizade pendente'
          })
        }
      }

      // Cria nova solicitação
      const friendship = new Friendship({
        requester: requesterId,
        recipient: recipientId,
        status: FriendshipStatus.PENDING
      })

      await friendship.save()

      return res.status(201).json({
        success: true,
        message: 'Solicitação de amizade enviada com sucesso'
      })
    } catch (error) {
      console.error('Erro ao enviar solicitação de amizade:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar solicitação de amizade'
      })
    }
  }

  // Aceitar solicitação de amizade
  public async acceptFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const recipientId = req.user.id
      const { requesterId } = req.params

      const friendship = await Friendship.findOne({
        requester: requesterId,
        recipient: recipientId,
        status: FriendshipStatus.PENDING
      })

      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Solicitação de amizade não encontrada'
        })
      }

      friendship.status = FriendshipStatus.FRIENDLY
      friendship.updatedAt = new Date()
      await friendship.save()

      return res.status(200).json({
        success: true,
        message: 'Solicitação de amizade aceita com sucesso'
      })
    } catch (error) {
      console.error('Erro ao aceitar solicitação de amizade:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao aceitar solicitação de amizade'
      })
    }
  }

  // Recusar/Cancelar solicitação de amizade
  public async rejectOrCancelFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { friendshipId } = req.params

      const friendship = await Friendship.findOne({
        $or: [
          { requester: userId, recipient: friendshipId },
          { requester: friendshipId, recipient: userId }
        ],
        status: { $in: [FriendshipStatus.PENDING, FriendshipStatus.FRIENDLY] }
      })

      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Solicitação de amizade não encontrada'
        })
      }

      friendship.status = FriendshipStatus.NONE
      friendship.updatedAt = new Date()
      await friendship.save()

      return res.status(200).json({
        success: true,
        message: 'Solicitação de amizade cancelada/recusada com sucesso'
      })
    } catch (error) {
      console.error('Erro ao cancelar/recusar solicitação de amizade:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao cancelar/recusar solicitação de amizade'
      })
    }
  }

  // Listar amigos
  public async listFriends(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { page = 1, limit = 20, sort = 'recent' } = req.query

      const skip = (Number(page) - 1) * Number(limit)
      const sortOptions: Record<string, 1 | -1> = { [sort === 'recent' ? 'updatedAt' : 'username']: sort === 'recent' ? -1 : 1 }

      const friendships = (await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: FriendshipStatus.FRIENDLY
      })
      .populate('requester recipient', 'username avatar bio')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))) as (IFriendship & { requester: PopulatedUser, recipient: PopulatedUser })[]

      const friends = friendships.map(friendship => {
        const friend = friendship.requester._id.toString() === userId 
          ? friendship.recipient 
          : friendship.requester
        return {
          id: friend._id,
          username: friend.username,
          avatar: friend.avatar,
          bio: friend.bio,
          friendshipId: friendship._id,
          since: friendship.updatedAt
        }
      })

      return res.status(200).json({
        success: true,
        data: friends
      })
    } catch (error) {
      console.error('Erro ao listar amigos:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar amigos'
      })
    }
  }

  // Listar solicitações pendentes
  public async listPendingRequests(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { type = 'received' } = req.query

      const query = type === 'received'
        ? { recipient: userId, status: FriendshipStatus.PENDING }
        : { requester: userId, status: FriendshipStatus.PENDING }

      const requests = await Friendship.find(query)
        .populate('requester recipient', 'username avatar bio')
        .sort({ createdAt: -1 })

      const formattedRequests = requests.map(request => ({
        id: request._id,
        user: type === 'received' ? request.requester : request.recipient,
        createdAt: request.createdAt
      }))

      return res.status(200).json({
        success: true,
        data: formattedRequests
      })
    } catch (error) {
      console.error('Erro ao listar solicitações pendentes:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar solicitações pendentes'
      })
    }
  }
} 
import { Request, Response } from 'express'
import { Friendship, FriendshipStatus } from '../models/Friendship'
 
import mongoose from 'mongoose'
 import { User } from '../models/User'
import { authMiddleware } from '../middlewares/auth.middleware'

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
  followers?: string[];
  following?: string[];
}

interface IFriendship extends mongoose.Document {
  requester: string | PopulatedUser;
  recipient: string | PopulatedUser;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class FriendshipController {
  static async sendFriendRequest(req: Request, res: Response): Promise<Response> {
    try {
      const requesterId = (req as AuthRequest).user?.id
      const { recipientId } = req.body

      // Verifica se já existe qualquer tipo de relacionamento
      let friendship = await Friendship.findOne({
        $or: [
          { requester: requesterId, recipient: recipientId },
          { requester: recipientId, recipient: requesterId }
        ]
      })

      if (friendship) {
        // Se já é amigo ou tem solicitação pendente, não permite alteração
        if ([FriendshipStatus.FRIENDLY, FriendshipStatus.PENDING].includes(friendship.status)) {
          return res.status(400).json({
            success: false,
            message: friendship.status === FriendshipStatus.FRIENDLY 
              ? 'Vocês já são amigos' 
              : 'Já existe uma solicitação pendente'
          })
        }

        // Se o status é NONE, apenas atualiza para PENDING
        friendship.status = FriendshipStatus.PENDING
        friendship.updatedAt = new Date()
        await friendship.save()

        return res.status(200).json({
          success: true,
          message: 'Solicitação de amizade enviada',
          data: friendship
        })
      }

      // Se não existe nenhum relacionamento, cria novo
      friendship = await Friendship.create({
        requester: requesterId,
        recipient: recipientId,
        status: FriendshipStatus.PENDING
      })

      return res.status(201).json({
        success: true,
        message: 'Solicitação de amizade enviada',
        data: friendship
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
  static async acceptFriendRequest(req: Request, res: Response): Promise<Response> {
    try {
      const recipientId = (req as AuthRequest).user?.id
      const { requesterId } = req.params

      // Primeiro, vamos remover quaisquer amizades duplicadas
      await Friendship.deleteMany({
        $and: [
          {
            $or: [
              { requester: requesterId, recipient: recipientId },
              { requester: recipientId, recipient: requesterId }
            ]
          },
          { status: { $ne: FriendshipStatus.PENDING } } // Mantém apenas a solicitação pendente
        ]
      })

      // Agora procura a solicitação pendente
      const friendship = await Friendship.findOne({
        $or: [
          { requester: requesterId, recipient: recipientId },
          { requester: recipientId, recipient: requesterId }
        ],
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
        message: 'Solicitação de amizade aceita com sucesso',
        data: friendship
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
  static async rejectFriendRequest(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as AuthRequest).user?.id
      const { friendshipId } = req.params

      const friendship = await Friendship.findOne({
        $or: [
          { requester: userId, recipient: friendshipId },
          { requester: friendshipId, recipient: userId }
        ]
      })

      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Relacionamento não encontrado'
        })
      }

      // Apenas atualiza o status para NONE
      friendship.status = FriendshipStatus.NONE
      friendship.updatedAt = new Date()
      await friendship.save()

      return res.status(200).json({
        success: true,
        message: 'Relacionamento atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro ao atualizar relacionamento:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar relacionamento'
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
  public async listPendingRequests(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as AuthRequest).user?.id

      const pendingRequests = await Friendship
        .find({
          $or: [
            { requester: userId, status: 'PENDING' },
            { recipient: userId, status: 'PENDING' }
          ]
        })
        .populate('requester recipient', '_id username bio avatar followers following')

      const requestsWithUserData = pendingRequests.map((request) => {
        const otherUser = (request.requester as PopulatedUser)._id.toString() === userId 
          ? (request.recipient as PopulatedUser)
          : (request.requester as PopulatedUser)

        return {
          id: request._id,
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            bio: otherUser.bio,
            avatar: otherUser.avatar,
            followers: otherUser.followers?.length || 0,
            following: otherUser.following?.length || 0
          },
          createdAt: request.createdAt
        }
      })

      return res.status(200).json({
        success: true,
        data: requestsWithUserData
      })
    } catch (error) {
      console.error('Erro ao listar solicitações pendentes:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar solicitações pendentes'
      })
    }
  }

  static async listSentRequests(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as AuthRequest).user?.id
      const requests = await Friendship.find({
        requester: userId,
        status: FriendshipStatus.PENDING
      }).populate('recipient', '_id username bio avatar followers following')
      
      return res.json({
        success: true,
        data: requests.map(req => ({
          id: req._id,
          user: req.recipient,
          createdAt: req.createdAt
        }))
      })
    } catch (error) {
      console.error('Erro ao listar solicitações enviadas:', error)
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar solicitações enviadas' 
      })
    }
  }

  static async listReceivedRequests(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as AuthRequest).user?.id
      const requests = await Friendship.find({
        recipient: userId,
        status: FriendshipStatus.PENDING
      }).populate('requester', '_id username bio avatar followers following')
      
      return res.json({
        success: true,
        data: requests.map(req => ({
          id: req._id,
          user: req.requester,
          createdAt: req.createdAt
        }))
      })
    } catch (error) {
      console.error('Erro ao listar solicitações recebidas:', error)
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar solicitações recebidas' 
      })
    }
  }
} 
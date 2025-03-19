import { Request, Response } from 'express'
import { Friendship, FriendshipStatus } from '../models/Friendship'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { authMiddleware } from '../middlewares/auth.middleware'
import { io } from '../../server'

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
  requester: mongoose.Types.ObjectId | PopulatedUser;
  recipient: mongoose.Types.ObjectId | PopulatedUser;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const FriendshipController = {
  sendFriendRequest: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const requesterId = req.user.id
      const { recipientId } = req.body

      // Evita auto-amizade
      if (requesterId === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível enviar solicitação para si mesmo'
        })
      }

      // Verifica se já existe qualquer tipo de relacionamento
      let friendship = await Friendship.findOne({
        $or: [
          { requester: requesterId, recipient: recipientId },
          { requester: recipientId, recipient: requesterId }
        ]
      })

      if (friendship) {
        // Se o status é NONE, cria uma nova solicitação com os papéis corretos
        if (friendship.status === FriendshipStatus.NONE) {
          // Remove o relacionamento antigo
          await Friendship.findByIdAndDelete(friendship._id)
          
          // Cria um novo relacionamento com os papéis corretos
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
        }

        // Se já é amigo ou tem solicitação pendente, não permite alteração
        return res.status(400).json({
          success: false,
          message: friendship.status === FriendshipStatus.FRIENDLY 
            ? 'Vocês já são amigos' 
            : 'Já existe uma solicitação pendente'
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
  },

  acceptFriendRequest: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id
      const requestId = req.params.requestId

      // Busca a amizade e garante que é o destinatário quem está aceitando
      const friendship = await Friendship.findOne({
        _id: requestId,
        recipient: userId,
        status: FriendshipStatus.PENDING
      })

      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Solicitação de amizade não encontrada ou você não tem permissão para aceitá-la'
        })
      }

      // Atualiza o status
      friendship.status = FriendshipStatus.FRIENDLY
      friendship.updatedAt = new Date()
      await friendship.save()

      return res.json({
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
  },

  rejectFriendRequest: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id
      const requestId = req.params.requestId

      // Busca a amizade sem filtros inicialmente
      const friendship = await Friendship.findById(requestId)

      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Solicitação de amizade não encontrada'
        })
      }

      // Permite que tanto o recipient quanto o requester possam rejeitar/cancelar
      if (friendship.recipient.toString() !== userId && 
          friendship.requester.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para rejeitar esta solicitação'
        })
      }

      // Verifica se a solicitação está pendente
      if (friendship.status !== FriendshipStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'Esta solicitação não está mais pendente'
        })
      }

      // Atualiza o status
      friendship.status = FriendshipStatus.NONE
      friendship.updatedAt = new Date()
      await friendship.save()

      return res.json({
        success: true,
        message: 'Solicitação de amizade rejeitada com sucesso'
      })
    } catch (error) {
      console.error('Erro ao rejeitar solicitação de amizade:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao rejeitar solicitação de amizade'
      })
    }
  },

  listFriends: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id

      const friendships = await Friendship.find({
        $or: [
          { requester: userId },
          { recipient: userId }
        ],
        status: FriendshipStatus.FRIENDLY
      }).populate('requester recipient', '_id username bio avatar followers following')

      const friends = friendships.map(friendship => {
        const friend = (friendship.requester as PopulatedUser)._id.toString() === userId 
          ? (friendship.recipient as PopulatedUser)
          : (friendship.requester as PopulatedUser)

        return {
          id: friend._id,
          username: friend.username,
          bio: friend.bio,
          avatar: friend.avatar,
          followers: friend.followers,
          following: friend.following,
          friendshipId: friendship._id
        }
      })

      return res.json({
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
  },

  listPendingRequests: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id

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
  },

  listSentRequests: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id
      const requests = await Friendship.find({
        requester: userId,
        status: FriendshipStatus.PENDING
      }).populate('recipient', '_id username bio avatar followers following')
      
      return res.json({
        success: true,
        data: requests.map(req => ({
          id: req._id,
          user: {
            _id: (req.recipient as PopulatedUser)._id,
            username: (req.recipient as PopulatedUser).username,
            bio: (req.recipient as PopulatedUser).bio,
            avatar: (req.recipient as PopulatedUser).avatar,
            followers: (req.recipient as PopulatedUser).followers?.length || 0,
            following: (req.recipient as PopulatedUser).following?.length || 0,
            isRequester: true,
            isRecipient: false
          },
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
  },

  listReceivedRequests: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id
      const requests = await Friendship.find({
        recipient: userId,
        status: FriendshipStatus.PENDING
      }).populate('requester', '_id username bio avatar followers following')
      
      return res.json({
        success: true,
        data: requests.map(req => ({
          id: req._id,
          user: {
            _id: (req.requester as PopulatedUser)._id,
            username: (req.requester as PopulatedUser).username,
            bio: (req.requester as PopulatedUser).bio,
            avatar: (req.requester as PopulatedUser).avatar,
            followers: (req.requester as PopulatedUser).followers?.length || 0,
            following: (req.requester as PopulatedUser).following?.length || 0,
            isRequester: false,
            isRecipient: true
          },
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
  },

  unfriend: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { friendshipId } = req.params
      const userId = req.user.id

      const friendship = await Friendship.findById(friendshipId)

      if (!friendship) {
        return res.status(404).json({ 
          success: false, 
          message: 'Amizade não encontrada' 
        })
      }

      // Verifica se o usuário tem permissão para desfazer a amizade
      if (friendship.requester.toString() !== userId && 
          friendship.recipient.toString() !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Você não tem permissão para desfazer esta amizade' 
        })
      }

      // Atualiza o status para NONE
      friendship.status = FriendshipStatus.NONE
      await friendship.save()

      // Obtém os IDs dos usuários envolvidos
      const otherUserId = friendship.requester.toString() === userId 
        ? friendship.recipient.toString() 
        : friendship.requester.toString()

      // Emite evento de atualização de amizade para ambos os usuários
      io.emit('friendship_update', {
        userId,
        otherUserId,
        status: FriendshipStatus.NONE
      })

      return res.status(200).json({
        success: true,
        message: 'Amizade desfeita com sucesso',
        data: friendship
      })

    } catch (error) {
      console.error('Erro ao desfazer amizade:', error)
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao desfazer amizade' 
      })
    }
  },

  checkFriendStatus: async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user.id
      const targetUserId = req.params.userId

      // Verifica se os IDs são válidos
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'IDs de usuário inválidos'
        })
      }

      // Busca relacionamento existente
      const friendship = await Friendship.findOne({
        $or: [
          { requester: userId, recipient: targetUserId },
          { requester: targetUserId, recipient: userId }
        ]
      })

      if (!friendship) {
        return res.json({
          success: true,
          data: {
            status: FriendshipStatus.NONE,
            friendshipId: null,
            isRequester: false,
            isRecipient: false,
            createdAt: null
          }
        })
      }

      return res.json({
        success: true,
        data: {
          status: friendship.status,
          friendshipId: friendship._id,
          isRequester: friendship.requester.toString() === userId,
          isRecipient: friendship.recipient.toString() === userId,
          createdAt: friendship.createdAt
        }
      })

    } catch (error) {
      console.error('Erro ao verificar status de amizade:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar status de amizade'
      })
    }
  }
} 
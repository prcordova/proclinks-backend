import { Request, Response } from 'express'
import { Message } from '../models/message.model'
import mongoose from 'mongoose'

export const messageController = {
  // Buscar histórico de mensagens entre dois usuários
  getMessages: async (req: Request, res: Response) => {
    try {
      const { userId, otherUserId } = req.params

      const messages = await Message.find({
        $or: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId }
        ]
      })
      .sort({ timestamp: 1 })
      .lean()

      return res.json({ success: true, data: messages })
    } catch (error) {
      console.error('Error getting messages:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar mensagens' 
      })
    }
  },

  // Marcar mensagens como lidas
  markAsRead: async (req: Request, res: Response) => {
    try {
      const { userId, otherUserId } = req.params

      await Message.updateMany(
        {
          senderId: otherUserId,
          recipientId: userId,
          read: false
        },
        {
          $set: { read: true }
        }
      )

      return res.json({ 
        success: true, 
        message: 'Mensagens marcadas como lidas' 
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao marcar mensagens como lidas' 
      })
    }
  },

  // Buscar todas as conversas do usuário
  getConversations: async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId || (req as any).user?.id

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        })
      }

      // Buscar todas as mensagens onde o usuário é remetente ou destinatário
      const messages = await Message.aggregate([
        {
          $match: {
            $or: [
              { senderId: new mongoose.Types.ObjectId(userId) },
              { recipientId: new mongoose.Types.ObjectId(userId) }
            ]
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: {
              $cond: {
                if: { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
                then: '$recipientId',
                else: '$senderId'
              }
            },
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$recipientId', new mongoose.Types.ObjectId(userId)] },
                      { $eq: ['$read', false] }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 1,
            user: {
              _id: '$user._id',
              username: '$user.username',
              avatar: '$user.avatar'
            },
            lastMessage: 1,
            unreadCount: 1
          }
        }
      ])

      return res.json({ success: true, data: messages })
    } catch (error) {
      console.error('Error getting conversations:', error)
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar conversas'
      })
    }
  },

  // Salvar nova mensagem
  saveMessage: async (req: Request, res: Response) => {
    try {
      const { senderId, recipientId, content } = req.body

      const message = await Message.create({
        senderId: new mongoose.Types.ObjectId(senderId),
        recipientId: new mongoose.Types.ObjectId(recipientId),
        content,
        timestamp: new Date()
      })

      return res.json({ success: true, data: message })
    } catch (error) {
      console.error('Error saving message:', error)
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar mensagem'
      })
    }
  }
} 
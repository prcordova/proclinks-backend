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
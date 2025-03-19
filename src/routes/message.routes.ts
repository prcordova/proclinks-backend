import { Router } from 'express'
import { messageController } from '../controllers/message.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const messageRouter = Router()

messageRouter.use(authMiddleware)

// Buscar histórico de mensagens
messageRouter.get('/:userId/:otherUserId', messageController.getMessages)

// Marcar mensagens como lidas
messageRouter.put('/:userId/:otherUserId/read', messageController.markAsRead)

// Salvar nova mensagem
messageRouter.post('/', messageController.saveMessage)

export { messageRouter } 
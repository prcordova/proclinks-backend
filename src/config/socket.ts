import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'

export let io: Server

export const connectedUsers = new Map<string, string>()

export function initializeSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'https://www.melter.com.br',
        'https://proclinks.vercel.app',
        'https://proclinks-git-dev-melterdev.vercel.app',
        'https://proclinks-melterdev.vercel.app'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id)

    socket.on('user_connected', (userId: string) => {
      console.log('Usuário conectado:', userId)
      connectedUsers.set(userId, socket.id)
    })

    socket.on('send_message', async (message) => {
      const recipientSocketId = connectedUsers.get(message.recipientId)
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', message)
      }
    })

    socket.on('friendship_update', ({ userId, otherUserId, status }) => {
      console.log('Atualizando amizade:', { userId, otherUserId, status })
      
      // Notifica ambos os usuários sobre a mudança no status da amizade
      const userSocketId = connectedUsers.get(userId)
      const otherUserSocketId = connectedUsers.get(otherUserId)

      if (userSocketId) {
        io.to(userSocketId).emit('friendship_update', { userId: otherUserId, status })
      }

      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit('friendship_update', { userId, status })
      }
    })

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id)
      // Remove o usuário da lista de conectados
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId)
          break
        }
      }
    })
  })

  return io
}
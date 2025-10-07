import app from './app'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'

dotenv.config()

const httpServer = createServer(app)

// Configuração do Socket.IO
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: [
      'https://www.melter.com.br', 
      'https://proclinks.vercel.app',
      'http://localhost:3000',
      'https://proclinks-avatars-dev.s3.us-east-2.amazonaws.com',
      // Adiciona suporte para todos os previews da Vercel
      /^https:\/\/proclinks-.*\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
})

// Armazenar usuários conectados
const connectedUsers = new Map()

io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id)

  socket.on('user_connected', (userId: string) => {
    connectedUsers.set(userId, socket.id)
    console.log('Usuário registrado:', userId)
  })

  socket.on('send_message', (data: { 
    senderId: string
    recipientId: string
    content: string 
  }) => {
    console.log('Mensagem recebida:', data)
    const recipientSocket = connectedUsers.get(data.recipientId)
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('receive_message', {
        id: Date.now().toString(),
        senderId: data.senderId,
        content: data.content,
        timestamp: new Date()
      })
      console.log('Mensagem enviada para:', recipientSocket)
    } else {
      console.log('Destinatário não encontrado:', data.recipientId)
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
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId)
        console.log('Usuário desconectado:', userId)
        break
      }
    }
  })

  socket.on('error', (error) => {
    console.error('Erro no socket:', error)
  })
})

// Exporta a instância do io para ser usada em outros arquivos
export { io }

const PORT = process.env.PORT || 8080

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
}) 
import express from 'express'
import cors from 'cors'
import path from 'path'
import './src/config/database'  // Importa a configuração do banco
import { userRoutes } from './src/routes/user.routes'
import { authRoutes } from './src/routes/auth.routes'
import { linkRoutes } from './src/routes/link.routes'
import { paymentsRoutes } from './src/routes/payments.routes'
import friendshipRoutes from './src/routes/friendship.routes'
import { messageRouter } from './src/routes/message.routes'

import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Configuração específica do CORS
app.use(cors({
  origin: [
    'https://www.melter.com.br', 
    'https://proclinks.vercel.app',
    'http://localhost:3000',
    'https://proclinks-avatars-dev.s3.us-east-2.amazonaws.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Configuração do express.json para todas as rotas EXCETO o webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/links', linkRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/friendships', friendshipRoutes)
app.use('/api/messages', messageRouter)

export default app 
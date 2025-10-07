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

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log('Origin:', req.headers.origin)
  console.log('Headers:', req.headers)
  next()
})

// Configuração específica do CORS
app.use(cors({
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
}))

// Configuração do express.json para todas as rotas EXCETO o webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Rota raiz para testar se o servidor está respondendo
app.get('/', (req, res) => {
  res.json({ 
    message: 'ProcLinks API está funcionando!',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/links',
      '/api/payments',
      '/api/friendships',
      '/api/messages'
    ]
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/links', linkRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/friendships', friendshipRoutes)
app.use('/api/messages', messageRouter)

// Middleware para rotas não encontradas
app.use((req, res) => {
  console.log('Rota não encontrada:', req.method, req.path)
  res.status(404).json({ 
    success: false,
    message: 'Rota não encontrada',
    path: req.path,
    method: req.method
  })
})

export default app 
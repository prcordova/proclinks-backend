import express from 'express'
import cors from 'cors'
import path from 'path'
import './src/config/database'  // Importa a configuração do banco
import { userRoutes } from './src/routes/user.routes'
import { authRoutes } from './src/routes/auth.routes'
import { linkRoutes } from './src/routes/link.routes'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Configuração específica do CORS
app.use(cors({
  origin: [
    'https://proclinks-frontend-a9gfxs6za-prcordovas-projects.vercel.app',
    'https://proclinks.vercel.app',
    'http://localhost:3000',
    'https://proclinks-avatars-dev.s3.us-east-2.amazonaws.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Pode remover ou comentar estas linhas já que não usaremos mais
// const uploadsPath = path.join(process.cwd(), 'public/uploads')
// fs.mkdirSync(uploadsPath, { recursive: true })
// app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/links', linkRoutes)

export default app 
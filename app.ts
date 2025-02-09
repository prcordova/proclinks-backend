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
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Configurar o caminho absoluto para a pasta uploads usando process.cwd()
const uploadsPath = path.join(process.cwd(), 'public/uploads')

// Criar estrutura de pastas se não existir
fs.mkdirSync(uploadsPath, { recursive: true })

// Servir apenas a pasta uploads através da rota /uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/links', linkRoutes)

export default app 
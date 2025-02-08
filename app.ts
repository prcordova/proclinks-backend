import express from 'express'
import cors from 'cors'
import path from 'path'
 import './src/config/database'  // Importa a configuração do banco
import { userRoutes } from './src/routes/user.routes'
import { authRoutes } from './src/routes/auth.routes'
import { linkRoutes } from './src/routes/link.routes'
import fs from 'fs'

const app = express()

app.use(cors())
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
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import './src/config/database'  // Importa a configuração do banco
import { userRoutes } from './src/routes/user.routes'
import { authRoutes } from './src/routes/auth.routes'
import { linkRoutes } from './src/routes/link.routes'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/links', linkRoutes)

export default app 
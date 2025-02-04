import { Request, Response } from 'express'
import { User } from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Todos os campos são obrigatórios' 
      })
    }

    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.status(400).json({ 
        success: false,
        message: 'Usuário ou email já existe' 
      })
    }

    const user = await User.create({
      username,
      email,
      password,
    })

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    )

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
      }
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao criar usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}

export async function login(req: Request, res: Response) {
  try {
    console.log('Dados recebidos:', req.body)
    const { username, password } = req.body

    if (!username || !password) {
      console.log('Campos faltando:', { username: !!username, password: !!password })
      return res.status(400).json({ 
        success: false,
        message: 'Username e senha são obrigatórios' 
      })
    }

    console.log('Buscando usuário:', username)
    const user = await User.findOne({ username })
    
    if (!user) {
      console.log('Usuário não encontrado:', username)
      return res.status(400).json({ 
        success: false,
        message: 'Usuário não encontrado' 
      })
    }

    console.log('Verificando senha para:', username)
    const validPassword = await bcrypt.compare(password, user.password)
    
    if (!validPassword) {
      console.log('Senha inválida para:', username)
      return res.status(400).json({ 
        success: false,
        message: 'Senha inválida' 
      })
    }

    console.log('Gerando token para:', username)
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    )

    console.log('Login bem-sucedido para:', username)
    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
      }
    })
  } catch (error) {
    console.error('Erro completo:', error)
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao fazer login',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
} 
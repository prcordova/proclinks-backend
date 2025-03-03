import { Request, Response } from 'express'
import { User } from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PLAN_FEATURES } from '../models/Plans'

export const register = async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      email, 
      password, 
   
      phone, 
      termsAccepted,
      birthDate,
      fullName 
    } = req.body

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'É necessário aceitar os termos de uso'
      })
    }

    console.log('Dados recebidos:', req.body)

    if (!username || !email || !password  || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      })
    }

    // Verifica cada campo individualmente para mensagens específicas
    const existingUsername = await User.findOne({ username: username.toLowerCase() })
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username já está em uso'
      })
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      })
    }

    

    const existingPhone = await User.findOne({ phone })
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone já está em uso'
      })
    }

    const user = await User.create({
      username,
      email,
      password,
    
      phone,
      fullName,
      birthDate,
      isPublic: true,
      termsAndPrivacy: {
        terms: {
          accepted: true,
          acceptedAt: new Date(),
          version: '1.0' // Você pode gerenciar as versões dos termos
        },
        privacyHistory: [{
          acceptedAt: new Date(),
          version: '1.0',
          ip: req.ip // Captura o IP do usuário
        }]
      },
      profile: {
        backgroundColor: '#0f172a',
        cardColor: '#818cf8',
        textColor: '#818cf8',
        cardTextColor: '#ffffff',
        displayMode: 'list',
        cardStyle: 'rounded',
        animation: 'fade',
        font: 'default',
        spacing: 12,
        sortMode: 'custom',
        likesColor: '#ff0000'
      }
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
  } catch (error: any) {
    console.error('Erro no registro:', error)
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({ 
        success: false, 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} já está em uso` 
      })
    }

    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar conta' 
    })
  }
}

export async function login(req: Request, res: Response) {
  try {
    console.log('Dados recebidos:', req.body)
    const { username, password } = req.body

    if (!username || !password) {
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
      { id: user._id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    console.log('Login bem-sucedido para:', username)
    return res.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          following: user.following,
          plan: user.plan
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
import { Request, Response } from 'express'
import { User } from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body

    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.status(400).json({ message: 'Usuário ou email já existe' })
    }

    const user = await User.create({
      username,
      email,
      password,
    })

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar usuário' })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ message: 'Senha inválida' })
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao fazer login' })
  }
} 
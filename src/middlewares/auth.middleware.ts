import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      })
    }

    const token = authHeader.split(' ')[1]
    
    console.log('Token recebido:', token) // Debug

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret')
    console.log('Token decodificado:', decoded) // Debug

    ;(req as any).user = decoded

    next()
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error)
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    })
  }
} 
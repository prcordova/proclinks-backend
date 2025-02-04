import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido' })
  }

  const parts = authHeader.split(' ')

  if (parts.length !== 2) {
    return res.status(401).json({ message: 'Token mal formatado' })
  }

  const [scheme, token] = parts

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: 'Token mal formatado' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }
    ;(req as AuthRequest).user = { id: decoded.id }
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' })
  }
} 
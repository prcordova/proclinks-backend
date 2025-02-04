import { Router, Request, Response } from 'express'
import * as userController from '../controllers/user.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { UserController } from '../controllers/user.controller'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

const userRouter = Router()
const userControllerInstance = new UserController()

userRouter.get('/profile', (req: Request, res: Response) => 
  userController.getProfile(req as AuthRequest, res)
)

userRouter.put('/view-mode', (req: Request, res: Response) => 
  userController.updateViewMode(req as AuthRequest, res)
)

userRouter.put('/profile', authMiddleware, (req: Request, res: Response) => 
  userControllerInstance.updateProfile(req as AuthRequest, res)
)

userRouter.get('/:username', (req: Request, res: Response) => 
  userControllerInstance.getPublicProfile(req, res)
)

export { userRouter as userRoutes } 
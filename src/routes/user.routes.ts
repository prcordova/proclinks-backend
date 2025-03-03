import { Router, Request, Response } from 'express'
import { UserController } from '../controllers/user.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import multer from 'multer'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

const userRouter = Router()
const userController = new UserController()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

// Rotas protegidas (precisam vir ANTES da rota com parâmetro)
userRouter.get('/profile', authMiddleware, (req: Request, res: Response) => 
  userController.getProfile(req as AuthRequest, res)
)

userRouter.put('/profile', authMiddleware, (req: Request, res: Response) => 
  userController.updateProfile(req as AuthRequest, res)
)

userRouter.post(
  '/avatar',
  authMiddleware,
  upload.single('avatar'),
  (req: Request, res: Response) => 
    userController.updateAvatar(req as AuthRequest, res)
)

// Rota pública (deve vir DEPOIS das rotas específicas)
userRouter.get('/:username', (req: Request, res: Response) => 
  userController.getPublicProfile(req, res)
)

userRouter.get('/', userController.listUsers)

userRouter.post('/:userId/follow', authMiddleware, userController.followUser)
userRouter.delete('/:userId/follow', authMiddleware, userController.unfollowUser)
userRouter.get('/:userId/follow-stats', userController.getFollowStats)
userRouter.get('/:username/followers', userController.getFollowersFromUser)
userRouter.get('/:username/following', userController.getFollowingFromUser)

userRouter.get('/header-info', authMiddleware, (req: Request, res: Response) => 
  userController.getHeaderInfo(req as AuthRequest, res)
)

export { userRouter as userRoutes } 
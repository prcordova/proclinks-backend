import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { FriendshipController } from '../controllers/friendship.controller'
import { Request, Response, NextFunction } from 'express'

interface AuthRequest extends Request {
  user: {
    id: string;
  };
}

const router = Router()

// Wrapper para converter os métodos do controller para o tipo correto
const wrapHandler = (handler: (req: AuthRequest, res: Response) => Promise<Response>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await handler(req as AuthRequest, res)
    } catch (error) {
      next(error)
    }
  }
}

router.get('/friends', authMiddleware, wrapHandler(FriendshipController.listFriends))
router.get('/requests/sent', authMiddleware, wrapHandler(FriendshipController.listSentRequests))
router.get('/requests/received', authMiddleware, wrapHandler(FriendshipController.listReceivedRequests))
router.post('/requests', authMiddleware, wrapHandler(FriendshipController.sendFriendRequest))
router.post('/requests/:requestId/accept', authMiddleware, wrapHandler(FriendshipController.acceptFriendRequest))
router.post('/requests/:requestId/reject', authMiddleware, wrapHandler(FriendshipController.rejectFriendRequest))
router.post('/:friendshipId/unfriend', authMiddleware, wrapHandler(FriendshipController.unfriend))
router.get('/status/:userId', authMiddleware, wrapHandler(FriendshipController.checkFriendStatus))

export default router
import { Router } from 'express'
import { FriendshipController } from '../controllers/friendship.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { Request, Response, NextFunction } from 'express'

const friendshipRouter = Router()
const friendshipController = new FriendshipController()

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Rotas protegidas
friendshipRouter.post('/request', authMiddleware, asyncHandler(friendshipController.sendFriendRequest))
friendshipRouter.post('/accept/:requesterId', authMiddleware, asyncHandler(friendshipController.acceptFriendRequest))
friendshipRouter.delete('/:friendshipId', authMiddleware, asyncHandler(friendshipController.rejectOrCancelFriendRequest))
friendshipRouter.get('/friends', authMiddleware, asyncHandler(friendshipController.listFriends))
friendshipRouter.get('/requests', authMiddleware, asyncHandler(friendshipController.listPendingRequests))

export { friendshipRouter as friendshipRoutes } 
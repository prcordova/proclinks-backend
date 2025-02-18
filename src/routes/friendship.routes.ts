import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { FriendshipController } from '../controllers/friendship.controller'
import { Friendship } from '../models/Friendship'

const router = Router()

router.get('/requests/sent', authMiddleware, FriendshipController.listSentRequests)
router.get('/requests/received', authMiddleware, FriendshipController.listReceivedRequests)
router.post('/requests', authMiddleware, FriendshipController.sendFriendRequest)
router.post('/requests/:requestId/accept', authMiddleware, FriendshipController.acceptFriendRequest)
router.delete('/requests/:requestId', authMiddleware, FriendshipController.rejectFriendRequest)

export default router
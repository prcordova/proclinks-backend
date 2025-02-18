import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { FriendshipController } from '../controllers/friendship.controller'
import { Friendship } from '../models/Friendship'

const router = Router()

router.get('/requests/sent', authMiddleware, FriendshipController.listSentRequests)
router.get('/requests/received', authMiddleware, FriendshipController.listReceivedRequests)
router.post('/requests', authMiddleware, FriendshipController.sendFriendRequest)
router.post('/requests/:requestId/accept', authMiddleware, FriendshipController.acceptFriendRequest)
router.post('/requests/:requestId/reject', authMiddleware, FriendshipController.rejectFriendRequest)
router.post('/:friendshipId/unfriend', authMiddleware, FriendshipController.unfriend)

export default router
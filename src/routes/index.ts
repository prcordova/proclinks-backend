import { Router } from 'express'
import { userRouter } from './user.routes'
import { messageRouter } from './message.routes'

const routes = Router()

routes.use('/users', userRouter)
routes.use('/messages', messageRouter)

export { routes } 
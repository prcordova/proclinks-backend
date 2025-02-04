import { Router, Request, Response } from 'express'
import * as linkController from '../controllers/link.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

const router = Router()

// Rota pública (sem auth)
router.get('/user/:username', linkController.getPublicLinks)

router.use(authMiddleware) // Protege todas as rotas abaixo

router.post('/', (req: Request, res: Response) => 
  linkController.createLink(req as AuthRequest, res)
)

router.get('/', (req: Request, res: Response) => 
  linkController.listLinks(req as AuthRequest, res)
)

router.post('/reorder', (req: Request, res: Response) => 
  linkController.reorderLinks(req as AuthRequest, res)
)

router.put('/:id', (req: Request, res: Response) => 
  linkController.updateLink(req as AuthRequest, res)
)

router.delete('/:id', (req: Request, res: Response) => 
  linkController.deleteLink(req as AuthRequest, res)
)

router.get('/:username', (req, res) => linkController.getPublicLinks(req, res))

export const linkRoutes = router 
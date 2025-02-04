import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Link from '../models/Link'
import { User } from '../models/User'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

export const createLink = async (req: AuthRequest, res: Response) => {
  const { title, url, visible } = req.body
  const userId = req.user.id

  try {
    const lastLink = await Link.findOne({ userId }).sort({ order: -1 })
    const nextOrder = (lastLink?.order || 0) + 1

    const link = await Link.create({
      title,
      url,
      visible,
      userId,
      order: nextOrder
    })

    return res.json(link)
  } catch (error) {
    console.error('Erro ao criar link:', error)
    return res.status(400).json({ message: 'Erro ao criar link' })
  }
}

export const listLinks = async (req: AuthRequest, res: Response) => {
  const userId = req.user.id

  try {
    const links = await Link.find({ userId }).sort({ order: 1 })
    
    // Transforma _id em id na resposta
    const formattedLinks = links.map(link => ({
      id: link._id.toString(), // Converte ObjectId para string
      title: link.title,
      url: link.url,
      visible: link.visible,
      order: link.order
    }))

    console.log('Links formatados:', formattedLinks)
    return res.json(formattedLinks)
  } catch (error) {
    console.error('Erro ao listar links:', error)
    return res.status(400).json({ message: 'Erro ao listar links' })
  }
}

export const updateLink = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { title, url, visible, order } = req.body
  const userId = req.user.id

  try {
    const link = await Link.findOne({ _id: id, userId })
    if (!link) {
      return res.status(404).json({ message: 'Link não encontrado' })
    }

    // Atualiza apenas os campos que foram enviados
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (url !== undefined) updateData.url = url
    if (visible !== undefined) updateData.visible = visible
    if (order !== undefined) updateData.order = order

    const updatedLink = await Link.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )

    console.log('Link atualizado:', updatedLink)
    return res.json({ success: true, data: updatedLink })
  } catch (error) {
    console.error('Erro ao atualizar link:', error)
    return res.status(400).json({ success: false, message: 'Erro ao atualizar link' })
  }
}

export const deleteLink = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    console.log('Tentando deletar link:', { id, userId })
    
    const link = await Link.findOne({ 
      _id: id,
      userId 
    })

    if (!link) {
      console.log('Link não encontrado:', { id, userId })
      return res.status(404).json({ message: 'Link não encontrado' })
    }

    await Link.findByIdAndDelete(id)
    console.log('Link deletado com sucesso:', id)
    
    return res.status(204).send()
  } catch (error) {
    console.error('Erro ao deletar link:', error)
    return res.status(400).json({ message: 'Erro ao deletar link' })
  }
}

export const reorderLinks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id
    const { links } = req.body

    // Atualiza a ordem de cada link
    for (let i = 0; i < links.length; i++) {
      await Link.findOneAndUpdate(
        { _id: links[i], userId },
        { order: i },
        { new: true }
      )
    }

    res.status(200).json({ message: 'Links reordenados com sucesso' })
  } catch (error) {
    console.error('Erro ao reordenar links:', error)
    res.status(500).json({ error: 'Erro ao reordenar links' })
  }
}

export const getPublicLinks = async (req: Request, res: Response) => {
  const { username } = req.params

  try {
    // Primeiro encontra o usuário pelo username
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    // Verifica se o usuário tem a propriedade isPublic
    const isPublic = user.get('isPublic')
    if (isPublic === false) {
      return res.status(403).json({ message: 'Este perfil é privado' })
    }

    // Busca os links visíveis do usuário, ordenados
    const links = await Link.find({ 
      userId: user.id,
      visible: true 
    }).sort({ order: 1 })

    return res.json(links)
  } catch (error) {
    console.error('Erro ao buscar links públicos:', error)
    return res.status(400).json({ message: 'Erro ao buscar links' })
  }
}

const getLinksByUserId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.userId
    
    const links = await Link.find({ 
      userId,
      visible: true 
    }).sort({ order: 1 })

    return res.status(200).json({
      success: true,
      data: links
    })
  } catch (error) {
    console.error('Erro ao buscar links:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar links'
    })
  }
}
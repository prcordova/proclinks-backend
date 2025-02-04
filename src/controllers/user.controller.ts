import { Request, Response } from 'express'
import { User } from '../models/User'
import Link from '../models/Link'
import path from 'path'
import fs from 'fs'

interface AuthRequest extends Request {
  user: {
    id: string
  }
}

export async function updateViewMode(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id
    const { viewMode } = req.body

    const user = await User.findByIdAndUpdate(
      userId,
      { viewMode },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    return res.json({ viewMode: user.viewMode })
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar modo de visualização' })
  }
}

export class UserController {
  public async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const {
        backgroundColor,
        cardColor,
        textColor,
        cardTextColor,
        displayMode,
        cardStyle,
        animation,
        font,
        spacing,
        sortMode,
        likesColor
      } = req.body

      const user = await User.findById(userId)
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Usuário não encontrado' 
        })
      }

      user.profile = {
        backgroundColor: backgroundColor || user.profile?.backgroundColor || '#ffffff',
        cardColor: cardColor || user.profile?.cardColor || '#f5f5f5',
        textColor: textColor || user.profile?.textColor || '#000000',
        cardTextColor: cardTextColor || user.profile?.cardTextColor || '#000000',
        displayMode: displayMode || user.profile?.displayMode || 'list',
        cardStyle: cardStyle || user.profile?.cardStyle || 'rounded',
        animation: animation || user.profile?.animation || 'none',
        font: font || user.profile?.font || 'default',
        spacing: spacing || user.profile?.spacing || 16,
        sortMode: sortMode || user.profile?.sortMode || 'custom',
        likesColor: likesColor || user.profile?.likesColor || '#ff0000'
      }

      await user.save()

      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: {
          profile: user.profile
        }
      })
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return res.status(500).json({ 
        success: false,
        message: 'Erro ao atualizar perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  public async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      
      // Busca o usuário com seus dados básicos
      const user = await User.findById(userId)
        .select('-password') // Exclui o campo password
        
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        })
      }

      // Busca os links do usuário
      const links = await Link.find({ 
        userId: user._id 
      }).sort({ order: 1 })

      // Retorna os dados completos
      return res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || null,
          bio: user.bio || '',
          profile: user.profile,
          followers: user.followers || [],
          following: user.following || [],
          links: links,
          viewMode: user.viewMode,
          isPublic: user.isPublic
        }
      })

    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  public async getPublicProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { username } = req.params
      console.log('Buscando perfil para username:', username)

      if (!username) {
        console.log('Username não fornecido')
        return res.status(400).json({
          success: false,
          message: 'Username não fornecido'
        })
      }

      const user = await User.findOne({ 
        username: username.toLowerCase() 
      })
      console.log('Usuário encontrado:', user)

      if (!user) {
        console.log('Usuário não encontrado para username:', username)
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        })
      }

      // Buscar os links visíveis do usuário
      const links = await Link.find({ 
        userId: user._id,
        visible: true 
      }).sort({ order: 1 })

      console.log('Links encontrados:', links) // Debug

      return res.status(200).json({
        success: true,
        data: {
          username: user.username,
          profile: user.profile,
          followers: user.followers,
          following: user.following,
          links: links
        }
      })
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfil'
      })
    }
  }

  public async updateAvatar(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma imagem foi enviada'
        })
      }

      const userId = req.user.id
      const user = await User.findById(userId)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        })
      }

      // Cria estrutura de diretórios
      const userUploadsPath = path.join(__dirname, '../../public/uploads/users', userId, 'avatar')
      fs.mkdirSync(userUploadsPath, { recursive: true })

      // Gera nome único para o arquivo
      const fileExtension = path.extname(req.file.originalname)
      const fileName = `${Date.now()}${fileExtension}`
      const filePath = path.join(userUploadsPath, fileName)

      // Remove avatar antigo se existir
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, '../../public', user.avatar)
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath)
        }
      }

      // Salva o novo arquivo
      fs.writeFileSync(filePath, req.file.buffer)

      // Atualiza o caminho do avatar no banco
      const avatarUrl = `/uploads/users/${userId}/avatar/${fileName}`
      user.avatar = avatarUrl
      await user.save()

      return res.status(200).json({
        success: true,
        message: 'Avatar atualizado com sucesso',
        avatarUrl
      })
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar avatar',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }
} 
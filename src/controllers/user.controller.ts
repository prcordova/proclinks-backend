import { Request, Response } from "express";
import { User, IUser } from "../models/User";
import Link from "../models/Link";
import path from "path";
import fs from "fs";
import { PlanType, PlanStatus, PLAN_FEATURES } from "../models/Plans";

interface AuthRequest extends Request {
  user: {
    id: string;
  };
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export async function updateViewMode(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id;
    const { viewMode } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { viewMode },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.json({ viewMode: user.viewMode });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erro ao atualizar modo de visualização" });
  }
}

export class UserController {
  public async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { profile, bio, links } = req.body
  
      const user = await User.findById(userId)
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Usuário não encontrado' 
        })
      }
  
      // Atualiza o perfil
      user.profile = {
        backgroundColor: profile.backgroundColor || user.profile?.backgroundColor || '#ffffff',
        cardColor: profile.cardColor || user.profile?.cardColor || '#f5f5f5',
        textColor: profile.textColor || user.profile?.textColor || '#000000',
        cardTextColor: profile.cardTextColor || user.profile?.cardTextColor || '#000000',
        displayMode: profile.displayMode || user.profile?.displayMode || 'list',
        cardStyle: profile.cardStyle || user.profile?.cardStyle || 'rounded',
        animation: profile.animation || user.profile?.animation || 'none',
        font: profile.font || user.profile?.font || 'default',
        spacing: profile.spacing || user.profile?.spacing || 16,
        sortMode: profile.sortMode || user.profile?.sortMode || 'custom',
        likesColor: profile.likesColor || user.profile?.likesColor || '#ff0000'
      }
  
      if (bio !== undefined) {
        user.bio = bio
      }
  
      // Salva as alterações do perfil
      await user.save()
  
      // Atualiza os links se foram enviados
      if (links && Array.isArray(links)) {
        const linkUpdates = links.map(async (linkData) => {
          const { _id, title, url, visible, order } = linkData
          return Link.findByIdAndUpdate(
            _id,
            { title, url, visible, order },
            { new: true }
          )
        })
  
        const updatedLinks = await Promise.all(linkUpdates)
  
        return res.status(200).json({
          success: true,
          message: 'Perfil e links atualizados com sucesso',
          data: {
            profile: user.profile,
            bio: user.bio,
            links: updatedLinks
          }
        })
      }
  
      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: {
          profile: user.profile,
          bio: user.bio
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
      const userId = req.user.id;

      const user = (await User.findById(userId).select(
        "-password"
      )) as IUser | null;

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      const links = await Link.find({
        userId: user._id,
      }).sort({ order: 1 });

      return res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || null,
          bio: user.bio || "",
          profile: user.profile,
          followers: user.followers || [],
          following: user.following || [],
          links: links,
          viewMode: user.viewMode,
          isPublic: user.isPublic,
          plan: {
            type: user.plan.type,
            status: user.plan.status,
            expirationDate: user.plan.expirationDate,
            features: PLAN_FEATURES[user.plan.type as PlanType],
          },
        },
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar perfil",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  public async getPublicProfile(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { username } = req.params;
      console.log("Buscando perfil para username:", username);

      if (!username) {
        console.log("Username não fornecido");
        return res.status(400).json({
          success: false,
          message: "Username não fornecido",
        });
      }

      const user = await User.findOne({
        username: username.toLowerCase(),
      }).select("-password");

      console.log("Usuário encontrado:", user);

      if (!user) {
        console.log("Usuário não encontrado para username:", username);
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      // Verifica se o perfil é público
      if (user.isPublic === false) {
        return res.status(403).json({
          success: false,
          message: "Este perfil é privado",
        });
      }

      // Buscar os links visíveis do usuário
      const links = await Link.find({
        userId: user._id,
        visible: true,
      }).sort({ order: 1 });

      console.log("Links encontrados:", links);

      return res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          
          avatar: user.avatar,
          bio: user.bio || "",
          profile: user.profile,
          followers: user.followers?.length || 0,
          following: user.following?.length || 0,
          links: links,
          plan: {
            type: user.plan.type,
            status: user.plan.status,
            features: PLAN_FEATURES[user.plan.type as PlanType],
          },
        },
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar perfil",
      });
    }
  }

  public async updateAvatar(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhuma imagem foi enviada",
        });
      }

      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      // Modificação 1: Usar process.env.UPLOAD_PATH ou um caminho absoluto configurável
      const baseUploadPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'public/uploads');
      const userUploadsPath = path.join(baseUploadPath, 'users', userId, 'avatar');

      // Modificação 2: Adicionar logs para debug
      console.log('Base upload path:', baseUploadPath);
      console.log('User uploads path:', userUploadsPath);

      // Modificação 3: Verificar e criar diretório com permissões específicas
      try {
        fs.mkdirSync(userUploadsPath, { 
          recursive: true, 
          mode: 0o755 // Adiciona permissões de leitura/escrita
        });
      } catch (mkdirError) {
        console.error('Erro ao criar diretório:', mkdirError);
        throw mkdirError;
      }

      // Gera nome único para o arquivo
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${Date.now()}${fileExtension}`;
      const filePath = path.join(userUploadsPath, fileName);

      // Modificação 4: Adicionar log do caminho completo do arquivo
      console.log('File path:', filePath);

      // Remove avatar antigo se existir
      if (user.avatar) {
        try {
          const oldAvatarPath = path.join(baseUploadPath, user.avatar.replace(/^\/uploads/, ''));
          console.log('Old avatar path:', oldAvatarPath);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        } catch (removeError) {
          console.error('Erro ao remover avatar antigo:', removeError);
          // Não interrompe o processo se falhar ao remover o avatar antigo
        }
      }

      // Modificação 5: Usar promises para escrita do arquivo
      await fs.promises.writeFile(filePath, req.file.buffer);

      // Modificação 6: Usar caminho relativo para URL
      const avatarUrl = `/uploads/users/${userId}/avatar/${fileName}`;
      user.avatar = avatarUrl;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Avatar atualizado com sucesso",
        avatarUrl,
      });
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar avatar",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  async listUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, filter = "popular", search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Usuários filtrados pela busca
      let searchResults: Array<any> = [];
      if (search) {
        searchResults = await User.find({
          isPublic: true,
          username: { $regex: search as string, $options: "i" },
        })
          .select(
            "username avatar bio followers following links plan lastLogin"
          )
          .limit(5);
      }

      // Usuários em destaque (relevância)
      const featuredUsers = await User.aggregate([
        { $match: { isPublic: true } },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$plan.type", "GOLD"] }, then: 100 },
                      { case: { $eq: ["$plan.type", "SILVER"] }, then: 50 },
                      { case: { $eq: ["$plan.type", "BRONZE"] }, then: 25 },
                    ],
                    default: 0,
                  },
                },
                { $multiply: [{ $size: "$followers" }, 0.5] },
                {
                  $multiply: [{ $sum: "$links.likes" }, 0.3],
                },
                {
                  $cond: {
                    if: {
                      $gte: [
                        "$lastLogin",
                        { $subtract: [new Date(), 7 * 24 * 60 * 60 * 1000] },
                      ],
                    },
                    then: 30,
                    else: 0,
                  },
                },
              ],
            },
          },
        },
        { $sort: { relevanceScore: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]);

      res.json({
        searchResults,
        featuredUsers,
        page: Number(page),
        hasMore: featuredUsers.length === Number(limit),
      });
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ message: "Erro ao listar usuários" });
    }
  }

  async followUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const followerId = req.user?.id;

      if (!followerId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Validar se não está tentando seguir a si mesmo
      if (userId === followerId) {
        return res
          .status(400)
          .json({ message: "Você não pode seguir a si mesmo" });
      }

      // Verificar se já segue
      const alreadyFollowing = await User.exists({
        _id: userId,
        followers: followerId,
      });

      if (alreadyFollowing) {
        return res.status(400).json({ message: "Você já segue este usuário" });
      }

      // Adicionar follower
      await User.findByIdAndUpdate(userId, {
        $addToSet: { followers: followerId },
      });

      // Adicionar following
      await User.findByIdAndUpdate(followerId, {
        $addToSet: { following: userId },
      });

      res.status(200).json({ message: "Usuário seguido com sucesso" });
    } catch (error) {
      console.error("Erro ao seguir usuário:", error);
      res.status(500).json({ message: "Erro ao seguir usuário" });
    }
  }

  async unfollowUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const followerId = req.user?.id;

      if (!followerId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Validar se está seguindo
      const isFollowing = await User.exists({
        _id: userId,
        followers: followerId,
      });

      if (!isFollowing) {
        return res.status(400).json({ message: "Você não segue este usuário" });
      }

      // Remover follower
      await User.findByIdAndUpdate(userId, {
        $pull: { followers: followerId },
      });

      // Remover following
      await User.findByIdAndUpdate(followerId, {
        $pull: { following: userId },
      });

      res.status(200).json({ message: "Deixou de seguir com sucesso" });
    } catch (error) {
      console.error("Erro ao deixar de seguir usuário:", error);
      res.status(500).json({ message: "Erro ao deixar de seguir usuário" });
    }
  }

  async getFollowStats(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select(
        "followersCount followingCount"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      res.json({
        success: true,
        data: {
          followers: user.followersCount,
          following: user.followingCount,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar estatísticas",
      });
    }
  }

  async getFollowersFromUser(req: Request, res: Response) {
    try {
      const { username } = req.params;
      console.log("Buscando seguidores para username:", username);

      const user = await User.findOne({ username }).populate("followers");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      res.json({
        success: true,
        data: {
          data: user.followers,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar seguidores:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao buscar seguidores",
      });
    }
  }

  async getFollowingFromUser(req: Request, res: Response) {
    try {
      const { username } = req.params;
      console.log("Buscando seguindo para username:", username);

      const user = await User.findOne({ username }).populate("following");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      res.json({
        success: true,
        data: {
          data: user.following,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar usuários seguidos:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao buscar usuários seguidos",
      });
    }
  }

  public async getHeaderInfo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      console.log('User from token:', req.user) // Debug
      const userId = req.user.id // Vem do token

      const user = await User.findById(userId)
        .select('username email avatar plan following')
        .lean()

      if (!user) {
        console.log('User not found for ID:', userId) // Debug
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          following: user.following,
          plan: {
            type: user.plan.type,
            status: user.plan.status
          }
        }
      })
    } catch (error) {
      console.error('Erro ao buscar informações do header:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar informações do usuário'
      })
    }
  }
}

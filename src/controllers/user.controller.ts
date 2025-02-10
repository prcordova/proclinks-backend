import { Request, Response } from "express";
import { User, IUser } from "../models/User";
import Link from "../models/Link";
import path from "path";
import fs from "fs";
import { PlanType, PlanStatus, PLAN_FEATURES } from "../models/Plans";
import { UploadService } from '../services/upload.service';

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

interface PopulatedUser {
  _id: string;
  username: string;
  avatar?: string;
  bio?: string;
  followers: string[];
  following: string[];
  plan?: {
    type: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';
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
 
      if (!username) {
         return res.status(400).json({
          success: false,
          message: "Username não fornecido",
        });
      }

      const user = await User.findOne({
        username: username.toLowerCase(),
      }).select("-password");

 
      if (!user) {
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
          followersIds: user.followers || [],
          followingIds: user.following || [],
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
          message: "Nenhuma imagem foi enviada"
        });
      }

      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado"
        });
      }

      // Remove avatar antigo se existir
      if (user.avatar) {
        await UploadService.deleteFile(user.avatar);
      }

      // Faz upload do novo avatar
      const avatarUrl = await UploadService.uploadAvatar(
        req.file.buffer,
        req.file.mimetype,
        userId
      );

      // Atualiza o usuário com a nova URL
      user.avatar = avatarUrl;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Avatar atualizado com sucesso",
        avatarUrl
      });
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar avatar",
        error: error instanceof Error ? error.message : "Erro desconhecido"
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
          .select("username avatar bio followers following plan.type")
          .limit(5)
          .lean()
          .then(users => users.map(user => ({
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            followers: user.followers?.length || 0,
            following: user.following?.length || 0,
            plan: {
              type: user.plan.type
            }
          })));
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
                { $multiply: [{ $sum: "$links.likes" }, 0.3] },
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
        {
          $project: {
            _id: 1,
            username: 1,
            avatar: 1,
            bio: 1,
            followers: { $size: "$followers" },
            following: { $size: "$following" },
            "plan.type": 1,
            relevanceScore: 1
          }
        }
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
 
      const user = await User.findOne({ username })
        .populate<{ followers: PopulatedUser[] }>('followers', 'username avatar bio plan.type followers following')
        .select('followers');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      const formattedFollowers = user.followers.map((follower: PopulatedUser) => ({
        id: follower._id,
        username: follower.username,
        avatar: follower.avatar,
        bio: follower.bio,
        followers: follower.followers?.length || 0,
        following: follower.following?.length || 0,
        plan: {
          type: follower.plan?.type
        }
      }));

      res.json({
        success: true,
        data: {
          data: formattedFollowers,
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
 
      const user = await User.findOne({ username })
        .populate<{ following: PopulatedUser[] }>('following', 'username avatar bio plan.type followers following')
        .select('following');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      const formattedFollowing = user.following.map((following: PopulatedUser) => ({
        id: following._id,
        username: following.username,
        avatar: following.avatar,
        bio: following.bio,
        followers: following.followers?.length || 0,
        following: following.following?.length || 0,
        plan: {
          type: following.plan?.type
        }
      }));

      res.json({
        success: true,
        data: {
          data: formattedFollowing,
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
       const userId = req.user.id // Vem do token

      const user = await User.findById(userId)
        .select('username email avatar plan following')
        .lean()

      if (!user) {
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

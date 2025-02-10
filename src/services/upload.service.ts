import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../config/s3.config';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export class UploadService {
  static async uploadAvatar(
    buffer: Buffer, 
    mimeType: string,
    userId: string
  ): Promise<string> {
    try {
      console.log('Iniciando upload do avatar...');
      
      // Otimiza a imagem
      const optimizedBuffer = await sharp(buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const fileKey = `avatars/${userId}/${uuidv4()}.jpg`;

      // Upload para S3 sem ACL
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        // Removido o ACL: 'public-read'
      };

      console.log('Enviando para S3:', {
        bucket: S3_BUCKET_NAME,
        fileKey,
        contentType: 'image/jpeg'
      });

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Retorna a URL pública
      const avatarUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
      
      console.log('Upload concluído:', avatarUrl);
      
      return avatarUrl;
    } catch (error) {
      console.error('Erro detalhado no upload:', error);
      throw new Error('Falha ao fazer upload do avatar');
    }
  }

  static async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl) return;
      
      // Extrai a chave do arquivo da URL
      const fileKey = fileUrl.split('.amazonaws.com/')[1];
      
      if (!fileKey) {
        console.log('URL inválida:', fileUrl);
        return;
      }

      console.log('Deletando arquivo:', {
        bucket: S3_BUCKET_NAME,
        fileKey
      });

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: fileKey
        })
      );
      
      console.log('Arquivo deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
    }
  }
} 
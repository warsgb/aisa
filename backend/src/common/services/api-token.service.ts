import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiTokenService {
  private readonly logger = new Logger(ApiTokenService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 生成新的 API Token
   */
  async generateToken(userId: string): Promise<string> {
    const token = this.generateRandomToken();

    await this.userRepository.update(userId, {
      api_token: token,
    });

    this.logger.log(`Generated API token for user: ${userId}`);
    return token;
  }

  /**
   * 验证 API Token 并返回用户信息
   */
  async validateToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { api_token: token, is_active: true },
    });

    if (user) {
      this.logger.log(`API token validated for user: ${user.email}`);
    } else {
      this.logger.warn(`Invalid API token provided`);
    }

    return user;
  }

  /**
   * 撤销（删除）用户的 API Token
   */
  async revokeToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      api_token: null as any,
    });

    this.logger.log(`Revoked API token for user: ${userId}`);
  }

  /**
   * 生成随机 Token
   */
  private generateRandomToken(): string {
    // 生成 32 字节的随机数据，转换为十六进制字符串
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 格式化 Token 显示（只显示前8位和后4位）
   */
  maskToken(token: string): string {
    if (!token || token.length < 12) {
      return '****';
    }
    return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
  }
}

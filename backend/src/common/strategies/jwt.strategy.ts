import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../../modules/auth/auth.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private authService: AuthService) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
    this.logger.log('JWT Strategy initialized');
  }

  async validate(req: any, payload: any) {
    // Only log safe fields from payload to avoid circular reference
    this.logger.log(`Validating JWT for user: ${payload.sub}`);
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      this.logger.error(`User not found for sub: ${payload.sub}`);
      throw new UnauthorizedException('User not found or inactive');
    }
    this.logger.log(`User validated: ${user.email} (${user.id})`);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      team_id: payload.team_id,
    };
  }
}

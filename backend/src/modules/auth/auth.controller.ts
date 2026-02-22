import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    sub?: string;
    team_id?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refresh_token: string) {
    return this.authService.refreshToken(refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new Error('User not authenticated: req.user is ' +
        JSON.stringify(req.user) + '. Please check your JWT token.');
    }
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('User ID not found in request user object');
    }
    return this.authService.getMe(userId, req.user.team_id);
  }

  @Post('switch-team')
  @UseGuards(JwtAuthGuard)
  async switchTeam(@Req() req: AuthenticatedRequest, @Body() dto: { team_id: string }) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('User ID not found in request user object');
    }
    return this.authService.switchTeam(userId, dto.team_id);
  }
}

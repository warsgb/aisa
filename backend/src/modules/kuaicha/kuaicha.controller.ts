import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { KuaichaService } from './kuaicha.service';

@Controller('kuaicha')
@UseGuards(JwtAuthGuard)
export class KuaichaController {
  constructor(private kuaichaService: KuaichaService) {}

  @Post('search')
  async search(@Body() dto: { query: string; customerId?: string }) {
    return this.kuaichaService.search(dto.query, dto.customerId);
  }

  @Get('health')
  async health() {
    return { status: 'ok', service: 'kuaicha-api' };
  }
}

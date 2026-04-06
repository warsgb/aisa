import { Module } from '@nestjs/common';
import { KuaichaController } from './kuaicha.controller';
import { KuaichaService } from './kuaicha.service';
import { AIService } from '../../common/services/ai.service';

@Module({
  controllers: [KuaichaController],
  providers: [KuaichaService, AIService],
  exports: [KuaichaService],
})
export class KuaichaModule {}

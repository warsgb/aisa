import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Customer360Service } from './customer360.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class Customer360Controller {
  constructor(private customer360Service: Customer360Service) {}

  @Post('teams/:teamId/customers/:customerId/generate-360')
  async generate360(
    @Param('teamId') teamId: string,
    @Param('customerId') customerId: string,
  ) {
    const filePath = await this.customer360Service.generateCustomer360Html(customerId, teamId);
    return {
      success: true,
      data: {
        customer_id: customerId,
        // 返回前端可直接访问的URL（不需要认证）
        preview_url: `/reports/${customerId}.html`,
        generated_at: new Date().toISOString(),
      },
    };
  }

  @Get('customer360/:customerId/preview')
  async getPreview(@Param('customerId') customerId: string) {
    const html = await this.customer360Service.getCustomer360Preview(customerId);
    return { html };
  }

  @Get('teams/:teamId/customers/:customerId/check-360')
  async checkExists(@Param('customerId') customerId: string) {
    const exists = await this.customer360Service.checkCustomer360Exists(customerId);
    return { exists };
  }

  @Get('customer360/:customerId/download')
  async download(
    @Param('customerId') customerId: string,
    @Res() res: any,
  ) {
    const buffer = await this.customer360Service.downloadCustomer360(customerId);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="customer360-${customerId}.html"`);
    res.send(buffer);
  }
}

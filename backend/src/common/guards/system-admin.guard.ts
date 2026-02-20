import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('System admin access required');
    }
    return true;
  }
}

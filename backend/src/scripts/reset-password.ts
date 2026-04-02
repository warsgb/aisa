import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';

async function bootstrap() {
  console.log('=== 重置用户密码 ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const dataSource = app.get(DataSource);

  const email = process.argv[2] || 'testuser@example.com';
  const newPassword = process.argv[3] || 'test123';

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await dataSource.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, full_name',
    [passwordHash, email]
  );

  if (result.length > 0) {
    console.log(`密码已重置!`);
    console.log(`  邮箱: ${email}`);
    console.log(`  新密码: ${newPassword}`);
  } else {
    console.log(`用户不存在: ${email}`);
  }

  await app.close();
}

bootstrap();

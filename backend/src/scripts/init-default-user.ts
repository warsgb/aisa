import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';

async function bootstrap() {
  console.log('=== AISA 用户初始化脚本 ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const dataSource = app.get(DataSource);

  // 检查是否已有用户
  const existingUser = await dataSource.query(
    'SELECT id, email, full_name, role FROM users LIMIT 1'
  );

  if (existingUser.length > 0) {
    console.log('数据库中已有用户:');
    existingUser.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.full_name}) - ${user.role}`);
    });
    console.log('\n如需重置密码，请使用系统管理页面的重置密码功能');
  } else {
    console.log('数据库中没有用户，正在创建默认用户...');

    const email = 'admin@aisa.com';
    const password = 'admin123';
    const fullName = '管理员';
    const passwordHash = await bcrypt.hash(password, 10);

    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
      [email, passwordHash, fullName, 'SYSTEM_ADMIN', true]
    );

    console.log(`\n默认用户创建成功!`);
    console.log(`  邮箱: ${email}`);
    console.log(`  密码: ${password}`);
    console.log(`  角色: SYSTEM_ADMIN`);
  }

  await app.close();
  console.log('\n=== 完成 ===');
}

bootstrap();

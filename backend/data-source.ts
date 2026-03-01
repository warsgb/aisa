import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, "src/**/*.entity{.ts,.js}")],
  migrations: [path.join(__dirname, "src/migrations/*{.ts,.js}")],
  synchronize: false,
  logging: false,
});

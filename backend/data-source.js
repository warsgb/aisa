require("reflect-metadata");
const path = require("path");
const dotenv = require("dotenv");
const DataSource = require("typeorm").DataSource;
require("ts-node/register");
require("tsconfig-paths/register");

// Load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, "dist/**/*.entity{.ts,.js}")],
  migrations: [path.join(__dirname, "dist/migrations/*{.ts,.js}")],
  synchronize: false,
  logging: false,
});

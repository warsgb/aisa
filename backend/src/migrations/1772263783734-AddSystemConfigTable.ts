import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemConfigTable1772263783734 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type if not exists
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE config_key_enum AS ENUM ('web_search_engine');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create system_configs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS system_configs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key config_key_enum NOT NULL UNIQUE,
                value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert default web search engine config
        await queryRunner.query(`
            INSERT INTO system_configs (key, value, description)
            VALUES ('web_search_engine', 'search_std', '智谱AI WebSearch 搜索引擎选择')
            ON CONFLICT (key) DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS system_configs`);
        await queryRunner.query(`DROP TYPE IF EXISTS config_key_enum`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchConfigsToSkills1772353159028 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add search_configs column to skills table
        await queryRunner.query(`
            ALTER TABLE skills
            ADD COLUMN IF NOT EXISTS search_configs jsonb;
        `);

        // Create GIN index for search_configs (useful for jsonb queries)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS IDX_skills_search_configs
            ON skills USING GIN (search_configs);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS IDX_skills_search_configs`);
        await queryRunner.query(`ALTER TABLE skills DROP COLUMN IF EXISTS search_configs`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSkillIndustryMappings1740817360000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add industry_mappings column to skills table
        await queryRunner.query(`
            ALTER TABLE skills
            ADD COLUMN IF NOT EXISTS industry_mappings jsonb DEFAULT '{}';
        `);

        // Create index for faster lookups (optional but recommended)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS IDX_skills_industry_mappings
            ON skills USING GIN (industry_mappings);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS IDX_skills_industry_mappings`);
        await queryRunner.query(`ALTER TABLE skills DROP COLUMN IF EXISTS industry_mappings`);
    }

}

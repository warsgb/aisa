import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddCustomerFollowups1772400000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'customer_followups',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'team_id', type: 'uuid' },
                    { name: 'customer_id', type: 'uuid' },
                    { name: 'user_id', type: 'uuid' },
                    { name: 'content', type: 'text' },
                    { name: 'created_at', type: 'timestamp', default: 'now()' },
                    { name: 'updated_at', type: 'timestamp', default: 'now()' },
                ],
            }),
            true,
        );

        await queryRunner.createForeignKey('customer_followups', new TableForeignKey({
            columnNames: ['customer_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'customers',
            onDelete: 'CASCADE',
        }));

        await queryRunner.createForeignKey('customer_followups', new TableForeignKey({
            columnNames: ['team_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'teams',
            onDelete: 'CASCADE',
        }));

        await queryRunner.createForeignKey('customer_followups', new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
        }));

        await queryRunner.createIndex('customer_followups', new TableIndex({
            name: 'idx_customer_followups_customer_id',
            columnNames: ['customer_id'],
        }));
        await queryRunner.createIndex('customer_followups', new TableIndex({
            name: 'idx_customer_followups_team_id',
            columnNames: ['team_id'],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('customer_followups');
    }

}

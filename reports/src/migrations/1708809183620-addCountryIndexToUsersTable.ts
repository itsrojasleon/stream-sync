import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCountryIndexToUsersTable1708809183620 implements MigrationInterface {
    name = 'AddCountryIndexToUsersTable1708809183620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "country" character varying`);
        await queryRunner.query(`CREATE INDEX "country_idx" ON "users" ("country") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."country_idx"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country"`);
    }

}

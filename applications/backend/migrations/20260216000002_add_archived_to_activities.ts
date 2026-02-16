import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('activities', (table) => {
    table.boolean('archived').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('archived');
  });
}

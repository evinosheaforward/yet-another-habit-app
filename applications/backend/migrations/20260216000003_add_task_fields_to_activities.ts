import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('activities', (table) => {
    table.boolean('task').notNullable().defaultTo(false);
    table.boolean('archive_task').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('task');
    table.dropColumn('archive_task');
  });
}

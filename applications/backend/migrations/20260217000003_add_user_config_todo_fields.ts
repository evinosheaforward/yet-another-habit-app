import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_configs', (table) => {
    table.boolean('clear_todo_on_new_day').notNullable().defaultTo(true);
    table.string('last_populated_date', 10).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_configs', (table) => {
    table.dropColumn('clear_todo_on_new_day');
    table.dropColumn('last_populated_date');
  });
}

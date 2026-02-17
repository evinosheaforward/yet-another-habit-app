import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('todo_day_configs', (table) => {
    table.dropUnique(['user_id', 'day_of_week', 'activity_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('todo_day_configs', (table) => {
    table.unique(['user_id', 'day_of_week', 'activity_id']);
  });
}

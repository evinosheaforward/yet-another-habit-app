import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('todo_day_configs', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 128).notNullable();
    table.integer('day_of_week').notNullable(); // 0=Sun .. 6=Sat
    table.string('activity_id', 36).notNullable().references('id').inTable('activities');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'day_of_week', 'activity_id']);
    table.index(['user_id', 'day_of_week', 'sort_order']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('todo_day_configs');
}

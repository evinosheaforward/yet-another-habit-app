import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('todo_date_configs', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 128).notNullable();
    table.string('activity_id', 36).notNullable().references('id').inTable('activities');
    table.string('scheduled_date', 10).notNullable(); // YYYY-MM-DD
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.index(['user_id', 'scheduled_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('todo_date_configs');
}

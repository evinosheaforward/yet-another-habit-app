import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('activities', (table) => {
    table
      .string('stacked_activity_id', 36)
      .nullable()
      .references('id')
      .inTable('activities')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('stacked_activity_id');
  });
}

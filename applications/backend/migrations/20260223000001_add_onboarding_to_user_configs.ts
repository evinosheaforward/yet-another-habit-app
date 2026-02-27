import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_configs', (table) => {
    table.text('completed_onboarding_steps').notNullable().defaultTo('[]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_configs', (table) => {
    table.dropColumn('completed_onboarding_steps');
  });
}

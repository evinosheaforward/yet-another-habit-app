import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("activities", (table) => {
    table.integer("goal_count").unsigned().notNullable().defaultTo(1);
    table.dropColumn("completion_percent");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("activities", (table) => {
    table.integer("completion_percent").unsigned().notNullable().defaultTo(0);
    table.dropColumn("goal_count");
  });
}

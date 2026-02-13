import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("activities_history", (table) => {
    table.string("id", 36).primary();
    table.string("activity_id", 36).notNullable().references("id").inTable("activities");
    table.string("user_id", 128).notNullable();
    table.date("start_date").notNullable();
    table.integer("count").unsigned().notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(["activity_id", "start_date"]);
    table.index(["user_id", "start_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("activities_history");
}

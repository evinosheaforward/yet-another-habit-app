import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("activity_completion_dates", (table) => {
    table.string("id", 36).primary();
    table.string("activity_id", 36).notNullable().references("id").inTable("activities");
    table.string("user_id", 128).notNullable();
    table.date("completion_date").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["activity_id", "completion_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("activity_completion_dates");
}

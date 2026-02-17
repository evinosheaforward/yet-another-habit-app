import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("todo_items", (table) => {
    table.string("id", 36).primary();
    table.string("user_id", 128).notNullable();
    table.string("activity_id", 36).notNullable().references("id").inTable("activities");
    table.integer("sort_order").notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.index(["user_id", "sort_order"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("todo_items");
}

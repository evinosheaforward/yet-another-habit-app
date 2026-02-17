import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("achievements", (table) => {
    table.string("id", 36).primary();
    table.string("user_id", 128).notNullable();
    table.string("title", 255).notNullable();
    table.text("reward").notNullable().defaultTo("");
    table.string("type", 10).notNullable(); // 'habit' | 'period' | 'todo'
    table.string("activity_id", 36).nullable().references("id").inTable("activities");
    table.string("period", 10).nullable(); // 'daily' | 'weekly' | 'monthly'
    table.integer("goal_count").unsigned().notNullable().defaultTo(1);
    table.integer("count").unsigned().notNullable().defaultTo(0);
    table.boolean("repeatable").notNullable().defaultTo(false);
    table.boolean("completed").notNullable().defaultTo(false);
    table.date("last_todo_increment_date").nullable();
    table.timestamps(true, true);

    table.index(["user_id"]);
    table.index(["user_id", "type"]);
    table.index(["user_id", "activity_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("achievements");
}

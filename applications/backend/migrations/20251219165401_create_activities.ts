import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("activities", (table) => {
    table.string("id", 36).primary(); // query-by-id is fast via PK index
    table.string("user_id", 128).notNullable();

    table
      .enu("period", ["daily", "weekly", "monthly"], {
        useNative: true,
        enumName: "activity_period",
      })
      .notNullable();

    table.string("title", 255).notNullable();
    table.text("description").notNullable();

    table
      .integer("completion_percent")
      .unsigned()
      .notNullable()
      .defaultTo(0);

    table.timestamps(true, true); 
    table.index(["user_id", "period"], "idx_activities_user_period");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("activities");
}


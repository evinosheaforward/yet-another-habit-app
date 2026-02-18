# Tasks aka one-offs

Lets create the ability for users to create "one-off" tasks.

This will be an option on activity creation. For "task" (deletes when completed)

In the db for the activity, we can store a boolean field for "task".

We also will want, for tasks, to have an "auto-delete" or "auto-archive" - this will determine if compelting = archive or delete.

In the UI call it "archive instead of delete?" and have a boolean in the DB for "archive_task"

We will then need to update the "complete" / "increment" button. This button will now need to know if the item is a task.
If it is a task, then it will delete or archive the task automatically once complete. The delete for this will have no flow.

Users WILL NOT be able to change a task to a normal activity and vice versa - that friction will be good so they don't accidentally delete their data by making it a task.

This will require:

- extra options on the create page
- the extra option needs to be stored in the DB and the frontend needs that data (need two new rows in the db: "task" and "archive_task" both booleans)
- for tasks - the Activities page should only have a "complete" button - no details page button.
- when the complete button is pressed for a task, the task should be either deleted or archived, depending on the configuration of the task's "archive_task" field.
- on the archive page - make sure that archived tasks don't show a details page

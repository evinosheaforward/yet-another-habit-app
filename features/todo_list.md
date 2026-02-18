# Todo List

Lets make a page where you can create a "todo list" as a list view.

How it works:

- its an additional tab like "home" or "activities"
- you can add tasks / activities to it, activities can be added more than once, can be from any period (but period is added to title)
- the users can order the "todo list"
- need to store this in the db - can be a list of activity ids (can repeat)
- each item in this list simply can be "completed" or "removed" (removed from the todo list, not deleted)
- when an item is completed here - it will increment if its an activity, or delete if its a task
- there is a button to add "tasks"
- items in the list can be press-and-held to re-order

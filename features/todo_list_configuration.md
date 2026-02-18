# Advanced TO DO list configuration

Note: with "tasks" implemented I'm going to refer to activities that aren't tasks as "habits" - things that repeat are habits

Goal: we want to make the todo list into a fully useful feature that doesn't need to be re-configured every day.
Put another way: we want to let the user add the tasks into the todo list, but the habits should be automatically added

How we achieve this:

- daily habits get added to the todo list automatically
- have a "settings" page for the todo list
- have a way to add weekly or monthly activities to a day of the week, they will be automatically added to the todo for that day of the week
- the user can order the habits on the day of the week so if I have daily: "read" and weekly: "gym" I can set Wednesday to have gym, then read in that order

Result: the user can create a weekly schedule - without adding times that things need to be done.

Open question: how can we improve the way that users can add tasks into a weekly schedule?
its possible the user will have their own idea - like have a placeholder for "work" and then adding work-specific tasks for that day
any input on making this easier would be good

Implementation:

- adding a settings page button to the todo tab
- creating the "day of the week todo config" with each day of the week (sun-sat) as a pill at the top (like how periods work)
- user can then add in habits (activities that aren't tasks) that will be a part of the default "todo" for that day
- we will need data base rows for the users day-of-week configs, endpoints for get/update, and the API layer - we will also need the schema migrations to add these rows to the users database - its possible that adding to the user configs table would work well.
- the todo will then need to add "today's habits" from the config to the bottom of the todo list (we need to figure out how to make)
  - maybe in the todo list setting page we have a user config for "clear tasks from todo list"
  - this config will reset the todo list completely (will only be whats in that day-of-the-week config) if its a new day - if the config is off - then the todo list would update by: removing all habits from the todo list, leaving leftover tasks at the bottom of the list and adding all new (configured) habits to the top of the list
- the todo needs a new button that is "remove from todo" vs "complete the task" to make things easier

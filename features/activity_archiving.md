# The ability to archive an activity

We want to give the user more flexibility over their habits.
What we will do is add the ability to "archive" habits. These will not be deleted - they will simply be marked "archived" and then the queries for getting activities will exclude archived activities.

We will then want a page for archived activities where they can be "unarchived" a simple list of archived activities will do.
Archived activities list should include 2 buttons: one to un-archive, and the other will bring the user to the details page for that activity. The "archive" button on the details page should be replaced with an "un-archive" button on the details page for archived activities. Everything else about archived activites should be the same.

Todo:

- add column for "archived" for activities
- make GET queries get non-archived activities
- make a tab for "archive" which has list view of all archived activities - can GET with an "archived = true" - ONLY has archived activities on this page
- add "archive" button right about "delete" button on activity details page (note - archive button should bring user back to activities page after its pressed)
- details page for archived activities should show a "un-archive" button

# Habit stacking

The goal of this feature is to allow a user to set a habit that follows from another. When they complete/increment one activity, then the app will prompt them to complete another.

In order to do this we need to:

- add a configuration to the activity that is "stacked habit".
  - this means updating the create activity and activity details screen to add a selectable list that has other habits of the same period.
  - This data then needs to be sent in the api request, accepted, and stored in the db.
  - the activities table will need a new row for "stacked habit" which should use the activity id
- the rest is all UI - when a habit is stacked, that should be shown in the dropdown that shows the description of the habit as well
- when the habit is incremented, we want to then bring the user to the other activity and prompt them "did you complete this?" - keep in mind that activity could also have a stacked habit with it, so we will want the UI to navigate in a way that isn't creating a complicated tree the user will have to traverse out of.

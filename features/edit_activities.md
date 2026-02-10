# Feature: edit activities

Goal: add button to dropdown for activities that brings to the "activity details" page, which is where you can edit the activity.

things that can be changed:

- goal count
- title
- description

the page should also allow incrementing and decrementing the count as can be done in the drop down

This should be done though adding another page to the stack - so if the user hits the "back" button on the phone, they will be brought back to the "activites" page.

Code changes:

- the UI for the dropdown needs the new button
- the UI page for the activity details needs to be added
- the updates need to be able to be submitted to an update api
- the update api need to be called in the mobile/api code
- update api for activity needs to be created - requires the sql query for updating to work as well - failures should rollback and return helpful error to the user

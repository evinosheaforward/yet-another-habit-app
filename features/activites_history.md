# Activities History Design

## Feature goal

For a first pass at activites history, we simply want to all the user to increment and decrement the number of times they completed a task in the way/week/month and track that correctly.

## what we have currently

the app communicates with the backend correctly to create new activities. The activities only have title and description (we need to add the "goal count")

The frontend has a drop-down for the activities that are known, but it only displays title and description.

the backend has a table for activities - this is only the table of activities the user has, but does not track the history

api interactions from the frontend to the backend happen in the applications/mobile/api and we can GET the data from the backend currently

## what we need to add

### basic activites update

the create activity modal needs to also accept a "goal amount" for the activity. We then will want to save that as the goal for the activity (new row needed in the activities table)

the request that creates the activity needs to handle this data and the backend (in applications/backend) need to accept the data

the activities table in the backend needs to be updated to handle the row for the goal (create a new knex migration) and the sql queries that insert the activity to the database need to be updated.

### activities history tracking

Activities are currently fetched only using the activities table, but we now need an activites_history table that tracks the history.
To dos:

- create new table with knex migration
  - it should include the activity_id for joins between the activies and activity history table
  - need the start_date for the history row (start time of the day, week, month) we will use this to query for the "current" day/week/month by default
  - count - the number of times the activity has been complete
- need to update the GET request for getting activites to join on this table - we need to simply make the count 0 if we don't have a matching activities history row in the response. we will have to see this change through to the frontend as well.
- we need to make sure the get query for getting activities gets rows from activities_history
- The frontend needs to add the increment/decrement buttons in the dropdown for the activity. Incrementing/decrementing needs to send a post update to the backend. The backend will need a query that can create or update the existing activities_history row for this buttom / request. For this - make sure to use the best practice for mobile applications to avoid sending too many requests (e.g. use batching)

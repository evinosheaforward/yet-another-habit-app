# Feature Tasks

The goal of this feature is to create activities that self-delete when they are complete.

This will be an option in the "create" flow.

when the task is accomplished, its simply archived.

We will need to add the option to the UI for the create - it would also be good to be able to make a task

We also probably need the ability to archive activities as well:
 - archiving an activity "deletes" it - marks it "archived" in the database
 - database queryies for "activities" page has NOT archived=true

We will need to make sure to update the create call to 
we will also need a new api call / endpoint / db call for archiving an activity

we will need to add the archived and ephemeral columns to the activites table.

## open question:
help decide: should ephemeral tasks archive or delete completely when done?

## Modify the period of a task
it would be nice to be able to change a task's period. This should be easy

## managing archiving task

lastly, we will add a page for managing all activies. Here you could see archived activies. You could then un-archive the task and see the regular details for the archived tasks. So this will look the same as the activites page except it will show all periods and only archived. Instead of an archive button, there should be "unarchive" and "permanently delete" - with warning that the activity and history will delete.
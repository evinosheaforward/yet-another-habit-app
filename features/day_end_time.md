# day end time

For users, we want to be able to make the experience of "daily" tasks consistent.  
The problem is that we are using UTC for the date boundaries.

Instead, we want to be able to store the user's "day-end-time" in a db row for that user.
Instead for 00:00 UTC, they could select this to be any time. Times should be shown in their local time.

Lets add this to the home page. We can default to 00:00 user local time, but on the home page, they can change it.

If possible, we want to make sure that past days stay consistent
for example if I have my "day end" set to 00:00 UTC now, and then change it to 00:00 ET, I don't want my history to change.
this is because if a user travels, they wouldn't want their history to change on them.

We will need to be able to get/set the user's "day end time" via an API that the app can call. We will need a small table - call it "user configs" since we may add more user configs in the future. We should be able to use this config directly in our queries, rather than having the user supply it when making requests to get activity data, though I'll let you decide how best we should make the queries work such that the user consistently gets the activities from the "current" day.

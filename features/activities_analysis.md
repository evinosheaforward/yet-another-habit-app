# Activities analysis

goal: add a page to the activities that show

on the activity details page for a specific activity, we want to add the ability to plot the activity and the "count" over time.

Add to the activity details page, a plot of the activities history.
Grab the last n days/weeks/months and plot the results on a simple timeseries plot - it should show the goal as a horizontal line on the plot as well

This code will query the backend for "activity history" using the api layer (passes the activity id)
the backend needs a new api that allows a user to query the activity history by the activity ID and to get the last N (days, weeks, months)

the backend then needs the new api for this "get history" and it needs the new sql query which specifically gets recent history for that specific activity and returns it to be plotted.

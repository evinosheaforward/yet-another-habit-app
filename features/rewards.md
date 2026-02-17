# Rewards and achievements

Goal: we want the user to be able to reward themselves when they do what they want to do!

We want to make this an advanced configuration and support a few different types of rewards/achievements.

Achievement: the goal the user is trying to reach
Reward: a text description just for the user to themselves - for us to show to them to keep them encouraged and display when they achieve the goal.

Types of goals we want to support

- achieve a habit's daily/weekly/monthly goal X times
- achieve all habit goals in a day/week/month X times

Examples of these goals

- do all daily habits 5 times in one week
- in a week to all weekly habits
- in a week do all daily and all weekly habits
- for a specific habit - complete the goal 15 times

When a goal is complete, we want to alert the user of that, so we need a hook on increment to check for this.
This will get a little complicated - whats probably best is: when we increment a habit and it reaches 100% we then check for an achievement:

- check if there are achievements
- check if this goal is relevant to the achievement
- if it is, update the achievement in the db
- on decrement of a habit, we need to do the same check _if_ the decrement was down from 100% (i.e. the percent was at 100 when the habit was decremented)

Important note: the user may want the achievement to be repeatable: therefore we can't simply look at the history for a habit.

New users should have the default achievement "complete all your daily habits" the reward will be "Learn about achievements: you can set your own reward for custom achievements"

To do this:

- we need another tab in the UI for achievements
- we need that UI to show the list of current achievements and their progress
- we need to add a simple page for configuring achievements: change goal count, title, reward, and delete
  - note: the user can not edit the progress on an achievement
- we need a "create achievement" button with a pop-up for the form:
  - the user will set a title, reward, type (habit, todo, or period), and count
    - habit: when they complete habit X times
    - period: when they complete all habits of a certain peridos X times
    - todo: when they complete their todo list X times (we need to be careful that this can only increment once per day)
- we need the apis to create, update, and get achievements

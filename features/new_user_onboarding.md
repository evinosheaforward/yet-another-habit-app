# New user onboarding

To make this app really work well, we need to add new-user onboarding.

I'd like the onboarding to be at the account level - that way if the user has used the app in browser or mobile, they won't get onboarded twice.

The onboarding will need multiple steps - and the app, when started (+ logged in) can check the current step and see if there are more steps to do - this will also allow us to "onboard" users to _new_ features seemlessly.

Its also possible we could want different steps to have a "hook" so instead of overloading the user with everything at once. For example - showing users the "archive" tab the first time a habit or task gets archived.

The core features of the app that we will want to show users are:

- prompt the user to set the "day end time" which is used for when the day/week/month is complete
- creating habits
- habit stacking - creating a reminder to do one app when you complete another
- viewing the history of habits - bar and calendar view
- adding items to the todo list
- noting that items completed from the todo will increment the habit / delete the task
- creating "one-off tasks" and their toggles - noting that creating an item from the todo page is a one-off task
- adding to the todo list schedule - must note that habits added to a day of the week will repeat!
- todo calendar schedule
- clear todo on new day toggle should be highlighted
- acheievements: show the users achievements - and how they work
- show the user archived habits/tasks - demonstrate that history is still there until permantnetly deleted

Throughout the onboarding, we want to keep the philosophy of the app:

- the app is designed to integrate habit tracking and your todo list
- the goal is to be flexible with when you to your todo list items
- the goal is to make tracking habits easy, by integrating directly into your todo list
- it can be hard to create a schedule for things you need to get done - so the scheduling feature allows you to create a general schedule of what you'd like to do
- the idea is you can set a weekly schedule to build habits - without having to be overly rigid
- achievements are there for you to reward yourself for completing your habits and todos
- the aim is to createa a flexible todo list that integrates your habits directly - building consistency without rigidity

We need to create a user-onboarding flow that highlights buttons, navigates screens, and stores the user's "onboarding status" it should also be easy to add new features to the onboarding and it should allow existing users to get that onboarding.

Onboarding status should be stored in the database so that users won't get onboarded in both mobile and browser.

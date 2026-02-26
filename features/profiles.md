# Profiles

Lets make a new feature called "profiles" this is a way to create multiple "profiles" for their habits and todos
this would allow a user to have a personal and work profile - to keep them separate.

Implementation:

- there is a "profile" selection on the home page - user can click it to create a new profile, delete a profile, or change profiles
  - this can be a button that they click that brings to a "profile" page to make the UI on the home screen compact
- default is the "default profile" which is just profile = null (this will maintain backwards compatibility)
- when a profile is selected, the activities, todo and achievements are all for that profile. it changes what you see and the settings to that profile
- we can do this by adding an additional column to our tables that is "profile" - default for everything will have profile null - if its not specified, we can do "WHERE profile = null" in our queries
- when a profile is selected, the api calls will provide the profile (a string) and queries add "WHERE profile = <profile>"
- deleting a profile deletes _all data_ for that profile
- we will want an onboarding step for "profiles" we would want this at the _end_ of the current onboarding flow - it will explain how profiles work and will highlight the profiles button on the home page - but thats all it does

# User Privacy

We need to create user privacy policy and implement features related to it.

TODOs:

- create a privacy policy, which includes:
  - user data is not sold or re-used
  - user data is stored in database
  - user email and password are stored in firebase
  - database only contains the user ID firebase provides
  - a page on the app/website that has privacy policy that is publicly accessible, shows when creating account, and can be found any time
  - explains how the user can delete their account/data - deleting account = purge data
- create a delete activity feature
  - deletes activity
- create a delete account feature which:
  - has a button for the user to delete account with an "are you sure: this will delete all your data"
  - deletes all database rows related to the user: activities and activity history
  - deletes the user's info from firebase

# Server Environment Setup

Copy `server/.env.example` to `server/.env` and fill in the values before starting the API.

## SMTP for admin-created users

The admin create-user flow sends a plaintext password email through a generic SMTP account. Set these variables:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`

If these values are missing, the user creation request still succeeds, but the email send step will be logged as an error and the account will remain created.
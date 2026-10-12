# Auth

Passwords are hashed with PBKDF2 and never logged.
Session tokens live in the store from `src/db/redis.ts`.

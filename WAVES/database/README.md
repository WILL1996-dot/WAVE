# WAVES Database Design

The approved conceptual ERD was generated separately as DBML for dbdiagram.io. Keep that `.dbml` source with this project as `database/WAVES_ERD.dbml` when available.

**Do not run DBML directly in Supabase SQL Editor.** Before connecting real users, transform the approved ERD into versioned PostgreSQL migration files and add:

1. PostgreSQL enums/extensions and tables.
2. Foreign keys, unique/check constraints and indexes.
3. Auth-user profile creation trigger (if retained in the final architecture).
4. RLS policies and SQL grants for every exposed table.
5. Storage bucket and object policies.
6. Server-side functions/Edge Functions for atomic matchmaking, phone lookup, club role changes, location access grants, message-envelope validation, reports, and ledger operations.
7. Automated RLS tests for two or more different users, including blocked-user and expired/revoked-grant cases.

The mobile client must never contain a Supabase service-role key. A publishable client key is safe to expose only when RLS and server-side authorization are correctly configured.

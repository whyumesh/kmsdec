# Karobari Election Activation Guide

## What Was Changed

To "free" the karobari elections, the following changes were made:

1. **Updated Voting Route** (`src/app/api/voter/vote/karobari-members/route.ts`)
   - Added status check to ensure election is `ACTIVE` before allowing votes
   - Now matches the behavior of the Trustees election route

2. **Created Election Management API** (`src/app/api/admin/elections/route.ts`)
   - GET endpoint to view all elections
   - PATCH endpoint to update election status (requires admin authentication)
   - Supports status values: `UPCOMING`, `ACTIVE`, `COMPLETED`

3. **Created Activation Script** (`scripts/activate-karobari-election.ts`)
   - Standalone script to activate the karobari election
   - Can be run directly from command line

## How to Activate Karobari Election

### Option 1: Using the API Endpoint (Recommended)

Make a PATCH request to `/api/admin/elections` with admin authentication:

```bash
curl -X PATCH http://localhost:3000/api/admin/elections \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "electionType": "KAROBARI_MEMBERS",
    "status": "ACTIVE"
  }'
```

### Option 2: Using the Script

Run the activation script directly:

```bash
npx tsx scripts/activate-karobari-election.ts
```

Or if you have ts-node:

```bash
npx ts-node scripts/activate-karobari-election.ts
```

### Option 3: Direct Database Update

If you have direct database access, you can update the election status directly:

```sql
UPDATE elections 
SET status = 'ACTIVE' 
WHERE type = 'KAROBARI_MEMBERS';
```

## Verification

After activation, verify the election is active:

1. Check via API:
   ```bash
   curl http://localhost:3000/api/admin/elections
   ```

2. Check the election status shows as `ACTIVE` in the response

3. Try voting - voters should now be able to cast votes in the karobari election

## Current Restrictions

The karobari election still has these normal restrictions (which are expected):

- ✅ Voter must be authenticated
- ✅ Voter must not have already voted
- ✅ Election must be `ACTIVE` status (newly added)
- ✅ Voter must meet age requirements (if set)
- ✅ Voter must have a karobari zone assigned
- ✅ Candidates must be `APPROVED` status

## Notes

- The election status check was added to match the Trustees election behavior
- The election must be set to `ACTIVE` for voting to work
- Admin authentication is required to change election status via API
- The script can be run without authentication (direct database access)


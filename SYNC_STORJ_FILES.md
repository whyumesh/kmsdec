# Sync Storj Files - Fix Document Preview Issues

## Problem
You're getting errors like:
```
NoSuchKey: The specified key does not exist.
kmselection/kmselection/nominations/...
```

This happens because:
- Database has incorrect file paths with double bucket prefix
- File paths stored include bucket name when they shouldn't
- Storj expects paths like `nominations/...` not `kmselection/nominations/...`

## Solution: Run File Sync

I've created an automated sync endpoint that will:
1. ✅ List all files in your Storj bucket
2. ✅ Find matching database records
3. ✅ Update file paths to correct format
4. ✅ Report any missing files

## How to Run Sync

### Method 1: Via Browser/API Call

**Visit this URL in your browser or use Postman/curl:**

```
POST http://localhost:3000/api/admin/sync-storj-files
```

Or using curl:
```bash
curl -X POST http://localhost:3000/api/admin/sync-storj-files
```

### Method 2: Quick Verification First

Check if sync is needed:
```
GET http://localhost:3000/api/admin/sync-storj-files
```

This will show:
- If Storj is accessible
- How many database records exist
- Whether sync is needed

## What the Sync Does

1. **Scans Storj Bucket**: Lists all files starting with `nominations/`
2. **Reads Database**: Gets all file records from `uploaded_files` table
3. **Matches Files**: Tries to match database records with Storj files
4. **Fixes Paths**: Updates database paths to match actual Storj keys
5. **Reports Results**: Shows what was fixed, what's missing, etc.

## Expected Results

After running sync, you should see:

```json
{
  "status": "success",
  "results": {
    "totalStorjFiles": 150,
    "totalDatabaseRecords": 145,
    "matched": 140,
    "updated": 25,
    "missing": 5,
    "orphaned": 10
  },
  "summary": {
    "filesRecoverable": 140,
    "filesMissing": 5,
    "filesUpdated": 25
  }
}
```

## After Sync

1. **Test Document Preview**: 
   - Go to admin panel
   - Try viewing a candidate document
   - Should work now!

2. **If Some Files Still Missing**:
   - Check if files exist in database as base64 (backup)
   - Check local `./uploads/` directory
   - Files might have been deleted from Storj

## Manual Fix (Alternative)

If you prefer to fix manually, update your database:

```sql
-- Remove double bucket prefix
UPDATE uploaded_files 
SET file_path = REPLACE(file_path, 'kmselection/kmselection/', 'kmselection/')
WHERE file_path LIKE 'kmselection/kmselection/%';

-- Remove bucket prefix from nominations
UPDATE uploaded_files 
SET file_path = REPLACE(file_path, 'kmselection/nominations/', 'nominations/')
WHERE file_path LIKE 'kmselection/nominations/%';
```

## Troubleshooting

### Sync Returns "Storj is not configured"
- Make sure your `.env.local` has Storj credentials
- Restart your server after adding credentials

### Sync Shows "Access Denied"
- Verify your Storj credentials are correct
- Check your Storj account is active
- Ensure access grant has list/read permissions

### Files Still Not Visible After Sync
- Check the sync results - it will show which files are missing
- Some files might be in database as base64 (check `uploaded_files` table)
- Some files might have been deleted from Storj

### All Files Show as Missing
- Verify bucket name is correct: `kmselection`
- Check if files exist in Storj dashboard
- Files might be in a different bucket


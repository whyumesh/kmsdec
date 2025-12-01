# Your Storj Credentials (Fixed Format)

Here are your Storj credentials in the correct format for your `.env.local` file:

```bash
# Storj DCS Configuration
STORJ_ACCESS_KEY_ID=jvnzamexc66nbhhb3snhu6iyc67q
STORJ_SECRET_ACCESS_KEY=j3hpfazrl2i4ekcwtdhj462ez2modwufvoqroypcaci4wxru7oaa6
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=global
STORJ_BUCKET_NAME=kmselection
```

## Important Fixes Made:

1. **ENDPOINT**: Removed the `@` symbol at the beginning
   - ❌ Wrong: `@https://gateway.storjshare.io`
   - ✅ Correct: `https://gateway.storjshare.io`

2. **REGION**: Changed from `us-east-1` to `global`
   - Storj shows "Location: global" which is correct
   - The code now supports `global` as a valid region

3. **BUCKET_NAME**: Using `kmselection` as you specified

## Next Steps:

1. **Add to `.env.local`**:
   - Create or edit `.env.local` in your project root
   - Paste the credentials above
   - Save the file

2. **Restart your server**:
   ```bash
   npm run dev
   ```

3. **Verify Connection**:
   Visit: `http://localhost:3000/api/upload/diagnostic`
   Should show: `"status": "success"`

4. **Verify Documents**:
   Visit: `http://localhost:3000/api/admin/verify-storj-documents`
   This will show:
   - How many files are in your Storj bucket
   - Which files match your database records
   - Recovery status

5. **Test Upload**:
   - Go to nomination form
   - Try uploading a document
   - Should work now!

6. **Test Document Preview**:
   - Go to admin panel
   - Try viewing existing documents
   - Should work now!

## Troubleshooting:

### If you get "Access Denied" errors:
- Verify the bucket name is exactly `kmselection`
- Check that your access grant has full permissions
- Ensure your Storj account is active

### If you get "Bucket not found":
- The bucket name must match exactly: `kmselection`
- Check in Storj dashboard if bucket name is different
- Update `STORJ_BUCKET_NAME` to match exactly

### If documents still don't load:
- Check the verification endpoint first
- Look for any files in the `nominations/` folder in your bucket
- Some files might be in database as base64 (backup)


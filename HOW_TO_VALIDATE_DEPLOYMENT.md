# How to Validate Deployment - Step-by-Step Guide

## 🔍 Quick Validation Steps

### 1. Check Netlify Deployment Status

**Option A: Via Netlify Dashboard**
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Select your site (electkms.org)
3. Check the **Deploys** tab
4. Look for the latest deployment:
   - ✅ **Status**: "Published" (green checkmark)
   - ✅ **Build time**: Should show completion time
   - ✅ **Function size**: Should be <250MB (check build logs)

**Option B: Via Git Commit**
1. Check your latest commit on GitHub
2. Verify the commit message: "Fix Netlify deployment: Reduce function bundle size..."
3. Check if Netlify shows this commit as deployed

---

## 2. Test Trustees Voting Page - Search Functionality

### Step-by-Step Test:

1. **Open the Trustees Voting Page**
   - Go to: https://electkms.org/voter/vote/trustees
   - Or navigate: Login as voter → Dashboard → Vote for Trustees

2. **Initial State Check** (BEFORE searching)
   - ✅ You should see a search box at the top
   - ✅ You should see a message: "Please search for candidates" or similar
   - ✅ **NO candidates should be visible** (this is the key change!)
   - ✅ Only the search interface should be visible

3. **Search Functionality Test**
   - Type a candidate name in the search box (e.g., "John" or any name)
   - ✅ Candidates matching the search should appear
   - ✅ Only matching candidates should be shown
   - ✅ Clear the search box
   - ✅ Candidates should disappear again
   - ✅ Search prompt should reappear

4. **Expected Behavior**
   ```
   BEFORE SEARCH:
   - Search box: ✅ Visible
   - Candidates: ❌ Hidden
   - Message: "Please search for candidates"
   
   AFTER SEARCH:
   - Search box: ✅ Visible with text
   - Candidates: ✅ Visible (only matching ones)
   - Message: Hidden
   
   AFTER CLEARING SEARCH:
   - Search box: ✅ Empty
   - Candidates: ❌ Hidden again
   - Message: "Please search for candidates" reappears
   ```

---

## 3. Verify Deployment via Browser Developer Tools

### Check Build Version:

1. **Open Browser Developer Tools**
   - Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Go to **Network** tab
   - Refresh the page (`Ctrl+R` or `Cmd+R`)

2. **Check Response Headers**
   - Look for files like `_next/static/chunks/...`
   - Check the `Date` header - should be recent (today's date)
   - This confirms you're seeing the latest deployment

3. **Check Console for Errors**
   - Go to **Console** tab
   - Look for any red errors
   - ✅ Should see minimal/no errors
   - ❌ If you see errors, note them down

---

## 4. Test Other Key Features

### A. Voter Login Flow
1. Go to: https://electkms.org/voter/login
2. Enter phone number
3. Request OTP
4. Enter OTP
5. ✅ Should successfully login and redirect to dashboard

### B. Voter Dashboard
1. After login, check dashboard
2. ✅ Should show election options
3. ✅ Should show voting status
4. ✅ No errors should appear

### C. Admin Dashboard
1. Go to: https://electkms.org/admin/login
2. Login with admin credentials
3. ✅ Should access admin dashboard
4. ✅ Should see voter/candidate data

---

## 5. Check Function Bundle Size (Netlify)

### Via Netlify Dashboard:
1. Go to Netlify Dashboard → Your Site
2. Click on the latest deployment
3. Scroll to **Function logs** or **Build logs**
4. Look for:
   - ✅ Function size should be <250MB
   - ✅ No errors about "function exceeds maximum size"
   - ✅ Build should complete successfully

### Via Build Logs:
Look for these messages:
```
✅ "Function uploaded successfully"
✅ "Deploy site completed"
❌ NOT: "The function exceeds the maximum size of 250 MB"
```

---

## 6. Verify Code Changes Are Live

### Method 1: Check Page Source
1. Go to: https://electkms.org/voter/vote/trustees
2. Right-click → **View Page Source** (or `Ctrl+U`)
3. Search for: `hasSearched` or `globalSearchTerm`
4. ✅ Should find these variables (confirms new code is deployed)

### Method 2: Check Network Requests
1. Open Developer Tools → **Network** tab
2. Filter by: `JS` or `Chunk`
3. Look for recent JavaScript files
4. Check the `Last-Modified` header
5. ✅ Should show today's date/time

---

## 7. Quick Validation Checklist

Print this checklist and verify each item:

```
□ Netlify deployment shows "Published" status
□ Build completed without errors
□ Function size is <250MB
□ Trustees page shows search box
□ Trustees page does NOT show candidates initially
□ Search prompt message is visible
□ Searching shows candidates
□ Clearing search hides candidates again
□ Voter login works
□ Voter dashboard loads
□ Admin dashboard works
□ No console errors
□ Page loads quickly
```

---

## 8. Common Issues & Solutions

### Issue: Still seeing candidates without search
**Solution**: 
- Clear browser cache (`Ctrl+Shift+Delete`)
- Hard refresh (`Ctrl+F5` or `Cmd+Shift+R`)
- Try incognito/private mode

### Issue: Deployment not showing latest changes
**Solution**:
- Check Netlify dashboard for deployment status
- Wait 2-3 minutes for CDN cache to clear
- Try different browser or incognito mode

### Issue: Function size error
**Solution**:
- Check Netlify build logs
- Verify `netlify.toml` has correct configuration
- Check `next.config.js` has externalization

---

## 9. Advanced Validation

### Check Voter Data (if needed):
```bash
# Run these commands locally to verify voter data
npm run check:regions      # Check voter regions and zones
npm run validate:voters    # Validate voter data integrity
```

### Check Build Locally:
```bash
# Test build locally to ensure it works
npm run build
# Should complete without errors
```

---

## 10. Real-Time Monitoring

### Netlify Analytics:
1. Go to Netlify Dashboard → **Analytics**
2. Check:
   - Site visits
   - Page views
   - Function invocations
   - Error rates

### Browser Console:
- Keep Developer Tools open while testing
- Watch for any errors or warnings
- Check Network tab for failed requests

---

## ✅ Success Indicators

You'll know everything is correctly placed when:

1. ✅ **Netlify shows**: "Published" status with recent timestamp
2. ✅ **Trustees page**: Shows search box, NO candidates initially
3. ✅ **Search works**: Candidates appear only after searching
4. ✅ **No errors**: Browser console shows no critical errors
5. ✅ **Fast loading**: Pages load quickly
6. ✅ **Function size**: <250MB in Netlify logs

---

## 🆘 Need Help?

If something doesn't match the expected behavior:

1. **Screenshot the issue**
2. **Check browser console** for errors
3. **Check Netlify build logs** for deployment errors
4. **Note the exact steps** that led to the issue
5. **Share the details** for troubleshooting

---

**Last Updated**: Latest deployment
**Validation Guide Version**: 1.0



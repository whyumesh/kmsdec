# Local Testing Guide for SMS OTP

This guide will help you test the Twilio SMS OTP implementation locally before deploying to production.

## Prerequisites

1. ✅ Twilio account (free trial available)
2. ✅ Node.js installed
3. ✅ `.env.local` file in project root

---

## Step 1: Set Up Twilio Account

### 1.1 Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account (no credit card required for trial)
3. Verify your email and phone number

### 1.2 Get Your Twilio Credentials

After signing up, you'll get:

1. **Account SID** - Found in Dashboard → Account Info
2. **Auth Token** - Found in Dashboard → Account Info (click to reveal)
3. **Phone Number** - Found in Dashboard → Phone Numbers → Manage → Active numbers

**Note:** Twilio trial accounts come with:
- $15.50 free credit
- One phone number (can send SMS to verified numbers only during trial)
- Full API access

### 1.3 Verify Your Phone Number (Trial Account)

For trial accounts, you can only send SMS to **verified phone numbers**:

1. Go to Dashboard → Phone Numbers → Verified Caller IDs
2. Click "Add a new Caller ID"
3. Enter your phone number
4. Verify via SMS or call

---

## Step 2: Configure Local Environment

### 2.1 Update `.env.local` File

Open `.env.local` in your project root and add these lines:

```env
# Twilio SMS Configuration (for OTP sending)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"
```

**Important:**
- Replace `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual Account SID
- Replace `your_auth_token_here` with your actual Auth Token
- Replace `+1234567890` with your Twilio phone number (include country code, e.g., +1 for US)

### 2.2 Example `.env.local` Entry

```env
TWILIO_ACCOUNT_SID="ACa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
TWILIO_AUTH_TOKEN="abc123def456ghi789jkl012mno345pqr678"
TWILIO_PHONE_NUMBER="+15551234567"
```

---

## Step 3: Install Dependencies

Run this command to install the Twilio package:

```bash
npm install
```

This will install `twilio` package (already added to `package.json`).

---

## Step 4: Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

---

## Step 5: Test the SMS OTP Flow

### 5.1 Test Steps

1. **Open the voter login page:**
   - Navigate to: `http://localhost:3000/voter/login`

2. **Enter a phone number:**
   - Use a phone number that exists in your voter database
   - **Important:** For Twilio trial accounts, this phone number must be verified in Twilio dashboard

3. **Click "Send OTP":**
   - You should see: "OTP has been sent to your registered phone number"
   - Check your phone for the SMS

4. **Enter the OTP:**
   - Enter the 6-digit code you received via SMS
   - Click "Verify OTP"

5. **Verify login:**
   - You should be redirected to the voter dashboard

### 5.2 What to Check

✅ **Success Indicators:**
- SMS received on your phone
- OTP code is 6 digits
- Login works after entering OTP
- No errors in browser console
- Server logs show "SMS OTP sent successfully"

❌ **If SMS doesn't arrive:**
- Check Twilio dashboard → Logs → Messaging for errors
- Verify phone number is verified (for trial accounts)
- Check server console for error messages
- Verify `.env.local` has correct credentials

---

## Step 6: Check Server Logs

Watch your terminal/console for these log messages:

### Success Log:
```
✅ SMS sent to 3210*** | SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | Status: queued
```

### Error Log:
```
❌ SMS send failed for 3210***: [error message]
```

### Fallback Mode (if Twilio not configured):
```
⚠️  Twilio not configured. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER
```

---

## Step 7: Test Without Twilio (Fallback Mode)

If you want to test the flow without actually sending SMS:

1. **Don't add Twilio credentials** to `.env.local` (or comment them out)
2. The system will automatically fall back to console logging
3. Check your server console for the OTP code
4. Use that OTP to complete login

This is useful for:
- Testing the UI flow
- Development when you don't want to use SMS credits
- Debugging OTP generation logic

---

## Troubleshooting

### Issue: "Twilio credentials not configured"

**Solution:** 
- Check `.env.local` file exists
- Verify variable names are exactly: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Restart your dev server after adding credentials

### Issue: "Invalid phone number"

**Solution:**
- Ensure phone number includes country code (e.g., +91 for India, +1 for US)
- Remove spaces and special characters
- For trial accounts, phone must be verified in Twilio dashboard

### Issue: "SMS not received"

**Solutions:**
- **Trial account:** Verify the recipient phone number in Twilio dashboard
- Check Twilio account balance (trial has $15.50 free)
- Check Twilio dashboard → Logs → Messaging for delivery status
- Verify phone number format is correct

### Issue: "Rate limit exceeded"

**Solution:**
- Wait 15 minutes (rate limit: 3 OTP requests per 15 minutes)
- Check server logs for rate limit messages

### Issue: "OTP expired"

**Solution:**
- OTPs expire after 10 minutes
- Request a new OTP

---

## Testing Checklist

Before deploying to production, verify:

- [ ] Twilio account created and verified
- [ ] Credentials added to `.env.local`
- [ ] `npm install` completed successfully
- [ ] Dev server starts without errors
- [ ] SMS received on test phone number
- [ ] OTP verification works
- [ ] Login completes successfully
- [ ] Server logs show successful SMS sending
- [ ] Error handling works (test with invalid phone)
- [ ] Rate limiting works (try 4+ requests quickly)

---

## Next Steps After Local Testing

Once local testing is successful:

1. **Add Twilio credentials to Netlify:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

2. **Deploy to production:**
   - Push your code changes
   - Netlify will automatically deploy

3. **Test in production:**
   - Test with real voter phone numbers
   - Monitor Twilio dashboard for usage

---

## Cost Estimation

**Twilio Pricing (India):**
- ~₹0.60 per SMS (varies by carrier)
- Trial account: $15.50 free credit (~₹1,300)
- Example: 1000 SMS ≈ ₹600

**Monitor Usage:**
- Check Twilio Dashboard → Usage
- Set up billing alerts if needed

---

## Support

If you encounter issues:
1. Check Twilio Dashboard → Logs → Messaging
2. Check server console logs
3. Verify all environment variables are set correctly
4. Ensure phone numbers are in correct format


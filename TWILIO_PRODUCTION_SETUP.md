# Twilio Production Setup Guide

## ⚠️ Important: Free Trial vs Production Account

### Free Trial Account Limitations:
- ❌ Can only send SMS to **verified phone numbers** (you manually verify each one)
- ❌ Limited to $15.50 free credit (~25-30 SMS)
- ❌ Not suitable for production use
- ✅ Good for local testing only

### Production Account Requirements:
- ✅ Can send SMS to **any phone number** (no verification needed)
- ✅ Pay-as-you-go pricing
- ✅ Suitable for production use
- ✅ Same credentials work, just need to upgrade account

---

## Step 1: Upgrade Your Twilio Account

### 1.1 Add Payment Method

1. **Go to Twilio Console:**
   - Visit: https://console.twilio.com/
   - Login to your account

2. **Navigate to Billing:**
   - Click on your account name (top right)
   - Select **Billing** from dropdown
   - Or go directly: https://console.twilio.com/us1/develop/billing/overview

3. **Add Payment Method:**
   - Click **"Add Payment Method"**
   - Enter your credit/debit card details
   - Twilio will verify the card (small charge that's refunded)

4. **Verify Account:**
   - Twilio may ask for additional verification
   - Follow the prompts to complete verification

### 1.2 Account Upgrade Status

After adding payment method:
- Your account is automatically upgraded
- **No monthly fees** - you only pay for what you use
- Trial restrictions are removed
- You can now send SMS to any phone number

---

## Step 2: Verify Your Phone Number (Optional but Recommended)

Even though production accounts don't require verification, it's good practice:

1. **Go to Phone Numbers:**
   - Dashboard → Phone Numbers → Manage → Active numbers
   - Verify your Twilio phone number is active

2. **Check Messaging Settings:**
   - Ensure your phone number can send SMS
   - Some numbers may need to be configured for messaging

---

## Step 3: Configure on Netlify

### 3.1 Add Environment Variables

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Select your site

2. **Navigate to Environment Variables:**
   - Site settings → Environment variables
   - Click **"Add a variable"**

3. **Add These Three Variables:**

   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   ```

   **Important:**
   - Use the **same credentials** from your trial account
   - They don't change when you upgrade
   - Just add them to Netlify environment variables

4. **Save Changes:**
   - Click **"Save"**
   - Redeploy your site (or wait for next auto-deploy)

---

## Step 4: Test in Production

### 4.1 Deploy to Production

1. **Push your code** (if not already done):
   ```bash
   git add .
   git commit -m "Add Twilio SMS OTP support"
   git push
   ```

2. **Netlify will auto-deploy** with the new environment variables

### 4.2 Test the Flow

1. **Go to your production site:**
   - Visit: `https://your-site-name.netlify.app/voter/login`

2. **Test with any voter phone number:**
   - Enter a phone number from your voter database
   - Click "Send OTP"
   - **No verification needed** - SMS will be sent to any number

3. **Verify SMS received:**
   - Check the phone for OTP
   - Enter OTP and complete login

---

## Step 5: Monitor Usage & Costs

### 5.1 Check Twilio Dashboard

1. **Monitor Usage:**
   - Dashboard → Usage → Messaging
   - See how many SMS sent
   - Check costs

2. **Set Up Alerts:**
   - Billing → Alerts
   - Set spending limits/alerts
   - Get notified when usage is high

### 5.2 Cost Estimation

**Twilio SMS Pricing (India):**
- **Per SMS:** ~₹0.60 - ₹0.80 (varies by carrier)
- **Example costs:**
  - 100 SMS = ₹60-80
  - 1,000 SMS = ₹600-800
  - 10,000 SMS = ₹6,000-8,000

**Twilio SMS Pricing (US):**
- **Per SMS:** ~$0.0075 (₹0.60)
- **Example costs:**
  - 100 SMS = $0.75 (₹60)
  - 1,000 SMS = $7.50 (₹600)
  - 10,000 SMS = $75 (₹6,000)

**No Monthly Fees:**
- You only pay for SMS sent
- No subscription or setup fees
- Pay-as-you-go model

---

## Step 6: Best Practices

### 6.1 Cost Management

1. **Monitor Usage Regularly:**
   - Check Twilio dashboard weekly
   - Set up billing alerts

2. **Optimize SMS Sending:**
   - Only send OTP when needed
   - Rate limiting already in place (3 per 15 min)
   - Prevent duplicate sends

3. **Track Costs:**
   - Use Twilio's usage reports
   - Export data for analysis

### 6.2 Security

1. **Protect Credentials:**
   - Never commit credentials to Git ✅ (already done)
   - Use environment variables ✅ (already done)
   - Rotate Auth Token periodically

2. **Monitor for Abuse:**
   - Check for unusual activity
   - Review failed SMS attempts
   - Monitor rate limits

### 6.3 Reliability

1. **Error Handling:**
   - Already implemented with retry logic ✅
   - Graceful fallbacks ✅
   - Proper logging ✅

2. **Monitoring:**
   - Check Twilio logs regularly
   - Monitor delivery rates
   - Track error rates

---

## Troubleshooting

### Issue: "SMS not sent in production"

**Solutions:**
1. Verify environment variables are set in Netlify
2. Check Twilio account is upgraded (has payment method)
3. Check Twilio dashboard → Logs → Messaging for errors
4. Verify phone number format is correct

### Issue: "Account still in trial mode"

**Solutions:**
1. Ensure payment method is added and verified
2. Check Billing → Overview for account status
3. Contact Twilio support if needed

### Issue: "High costs"

**Solutions:**
1. Review usage in Twilio dashboard
2. Check for duplicate sends
3. Verify rate limiting is working
4. Set up billing alerts

---

## Summary

### ✅ What You Need to Do:

1. **Upgrade Twilio Account:**
   - Add payment method in Twilio dashboard
   - Account automatically upgrades (no monthly fees)

2. **Add Credentials to Netlify:**
   - Same credentials from trial account
   - Add as environment variables

3. **Deploy & Test:**
   - Push code changes
   - Test in production
   - Monitor usage

### 💰 Cost Expectations:

- **No monthly fees**
- **Pay per SMS:** ~₹0.60 per SMS in India
- **Example:** 1,000 voters = ~₹600-800
- **Monitor usage** to control costs

### 🎯 Key Differences:

| Feature | Trial Account | Production Account |
|---------|--------------|-------------------|
| SMS to verified numbers only | ✅ | ❌ |
| SMS to any number | ❌ | ✅ |
| Free credit | $15.50 | None (pay-as-you-go) |
| Suitable for production | ❌ | ✅ |
| Payment method required | ❌ | ✅ |

---

## Next Steps

1. ✅ Upgrade Twilio account (add payment method)
2. ✅ Add credentials to Netlify environment variables
3. ✅ Deploy to production
4. ✅ Test with real voter phone numbers
5. ✅ Monitor usage and costs

Once upgraded, your production site will work exactly like your local testing, but can send SMS to any phone number without verification!



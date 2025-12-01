# How to Fill Karobari Candidate Nomination Form

## Step-by-Step Guide

### Step 1: Login as Karobari Admin

1. Go to: **`http://localhost:3000/karobari-admin/login`**
2. Enter your credentials:
   - **Email**: `karobari01@kms-election.com` (or any of the 5 admin emails)
   - **Password**: `KarobariAdmin2025!`
3. Click **"Sign In"**

### Step 2: Access the Nomination Form

After logging in, you'll see the **Dashboard** with:

**Option 1 - From Dashboard (Easiest):**
- Look for the **"Quick Actions"** section on the dashboard
- Click the **"Add New Candidate"** button (large blue button with document icon)
- This will take you directly to the nomination form

**Option 2 - Direct URL:**
- Navigate directly to: **`http://localhost:3000/karobari-admin/nominate`**

**Option 3 - From Dashboard Navigation:**
- The dashboard has quick action buttons in the middle section
- Click **"Add New Candidate"** button

### Step 3: Fill Out the Form

The form has **3 main sections**:

#### 📋 Section 1: Office Use (Admin Only)
- Form Number
- Date of Taking Form
- Date of Accepting Form
- Outward Number
- Inward Number
- Election Fee Receipt Number (Rs. 3,000/-)

#### 👤 Section 2: Candidate Details
**Required Fields:**
1. **Candidate's Full Name** (3 fields):
   - Name (નામ)
   - Father/Husband Name (પિતાશ્રી/પતિ)
   - Surname (મુળ અટક)

2. **Other Name/Nickname** (if any, or write "N.A.")

3. **Current Residential Address** (as per Aadhar Card)

4. **Gender** (Male/Female)

5. **Date of Birth** (DD-MM-YYYY format)

6. **Mobile Number** (10 digits)

7. **E-mail**

8. **Zone Number and Name** (select from dropdown)

#### 🤝 Section 3: Supporter/Proposer Details
**Required Fields:**
1. **Supporter's Full Name** (3 fields):
   - Name (નામ)
   - Father/Husband Name (પિતાશ્રી/પતિ)
   - Surname (મુળ અટક)

2. **Supporter's Full Address**

3. **Supporter's Mobile Number** (10 digits)

### Step 4: Submit the Form

1. Review all fields
2. Click **"Submit Nomination"** button at the bottom
3. You'll see a success message
4. You'll be redirected to the candidates list

## Visual Guide

```
Dashboard
├── Welcome Message
├── Statistics Cards (Total, Pending, Approved, Rejected)
└── Quick Actions
    ├── [Add New Candidate] ← CLICK THIS
    └── [View All Candidates]
```

## Form Location

- **URL**: `/karobari-admin/nominate`
- **Access**: Only available after Karobari Admin login
- **Button Location**: Dashboard → Quick Actions → "Add New Candidate"

## Important Notes

✅ **All fields marked with * (asterisk) are required**
✅ **Email must be in valid format**
✅ **Mobile numbers must be exactly 10 digits**
✅ **Date format: DD-MM-YYYY** (e.g., 15-03-1990)
✅ **Zone must be selected from dropdown**
✅ **Form validation happens in real-time**

## Need Help?

- **Can't find the button?** Look for "Quick Actions" section on dashboard
- **Session expired?** Just login again
- **Form not loading?** Check browser console for errors
- **Validation errors?** Make sure all required fields are filled correctly

## After Submission

After successfully submitting:
- ✅ Success message appears
- ✅ Auto-redirect to candidates list
- ✅ Candidate appears with "SUBMITTED" status
- ✅ All data is saved to database
- ✅ You can view it in "View All Candidates"

---

**Quick Access**: Just remember: **Login → Dashboard → "Add New Candidate"** button!


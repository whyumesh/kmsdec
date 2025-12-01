# Karobari Admin System - Testing Guide

## Quick Test Steps

### 1. Access Login Page
- URL: `http://localhost:3000/karobari-admin/login`
- Should see: Karobari Admin Login page with email/password fields

### 2. Test Login
- **Email**: `karobari01@kms-election.com`
- **Password**: `KarobariAdmin2025!`
- Expected: Redirect to `/karobari-admin/dashboard`

### 3. Test Dashboard
- Should see:
  - Welcome message with admin name
  - Statistics cards (Total, Pending, Approved, Rejected)
  - Quick action buttons (Start Nomination, View Candidates)

### 4. Test Nomination Form
- Click "Start Nomination" or go to `/karobari-admin/nominate`
- Fill out the form:
  - **Office Use Section**: Optional fields
  - **Candidate Details**: All required fields
  - **Supporter Details**: All required fields
- Submit form
- Expected: Success message and redirect to candidates list

### 5. Verify Data Saved
- Check database or candidates list page
- Verify nomination appears with SUBMITTED status

## Test Credentials

| Admin | Email | Password |
|-------|-------|----------|
| Admin 01 | karobari01@kms-election.com | KarobariAdmin2025! |
| Admin 02 | karobari02@kms-election.com | KarobariAdmin2025! |
| Admin 03 | karobari03@kms-election.com | KarobariAdmin2025! |
| Admin 04 | karobari04@kms-election.com | KarobariAdmin2025! |
| Admin 05 | karobari05@kms-election.com | KarobariAdmin2025! |

## Expected Behaviors

✅ Login page loads correctly
✅ Can login with any of the 5 admin accounts
✅ Dashboard shows statistics
✅ Nomination form loads with all fields
✅ Form validation works (required fields, email format, mobile numbers)
✅ Form submission succeeds
✅ Data is saved to database
✅ Success message appears after submission

## Troubleshooting

If login fails:
- Check database connection
- Verify admin accounts exist (run seed script again)
- Check browser console for errors

If form submission fails:
- Check browser console for validation errors
- Verify all required fields are filled
- Check server logs for API errors


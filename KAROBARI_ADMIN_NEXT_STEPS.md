# Karobari Admin System - Next Steps

## ✅ What's Already Done

1. ✅ Database schema updated with `KarobariAdmin` model
2. ✅ 5 Karobari admin accounts created in seed file
3. ✅ Login page created (`/karobari-admin/login`)
4. ✅ Dashboard page created (`/karobari-admin/dashboard`)
5. ✅ Complete nomination form created (`/karobari-admin/nominate`)
6. ✅ API endpoints created for login, dashboard, and nominations
7. ✅ Authentication configured with NextAuth

## 🔧 Next Steps to Complete Setup

### Step 1: Verify Database Connection

Ensure your `.env` file has a valid `DATABASE_URL`:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Step 2: Run Database Migration

Create the `KarobariAdmin` table in your database:
```bash
npx prisma migrate dev --name add_karobari_admin
```

This will:
- Create a new migration file
- Apply the migration to your database
- Generate the Prisma Client with the new model

### Step 3: Seed the Database

Create the 5 Karobari admin accounts:
```bash
npm run db:seed
```

Or run directly:
```bash
npx tsx prisma/seed.ts
```

This creates 5 admin accounts with:
- **Email**: karobari01@kms-election.com through karobari05@kms-election.com
- **Password**: `KarobariAdmin2025!`
- **Role**: KAROBARI_ADMIN

### Step 4: Generate Prisma Client

Ensure Prisma Client is up to date:
```bash
npx prisma generate
```

### Step 5: Build the Project

Verify everything compiles correctly:
```bash
npm run build
```

### Step 6: Test the System

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Login as Karobari Admin**:
   - Navigate to: `http://localhost:3000/karobari-admin/login`
   - Use credentials:
     - Email: `karobari01@kms-election.com`
     - Password: `KarobariAdmin2025!`

3. **Test the Nomination Form**:
   - Navigate to: `http://localhost:3000/karobari-admin/nominate`
   - Fill out a test nomination form
   - Submit and verify it's saved

4. **Check Dashboard**:
   - Verify statistics are displayed correctly
   - Check that submitted nominations appear

### Step 7: Update Candidates List Page (Optional)

The candidates list page (`/karobari-admin/candidates`) is currently a placeholder. You may want to:
- Display all submitted Karobari candidates
- Show candidate details
- Add filters (by zone, status, etc.)
- Add search functionality

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] Database migration completed successfully
- [ ] All 5 Karobari admin accounts created
- [ ] Test login with each admin account
- [ ] Test nomination form submission
- [ ] Verify data is saved correctly in database
- [ ] Test zone dropdown loads correctly
- [ ] Verify authentication and authorization works
- [ ] Build completes without errors
- [ ] All API endpoints work correctly

## 🔐 Karobari Admin Credentials

| Admin ID | Email | Password |
|----------|-------|----------|
| KAROBARI001 | karobari01@kms-election.com | KarobariAdmin2025! |
| KAROBARI002 | karobari02@kms-election.com | KarobariAdmin2025! |
| KAROBARI003 | karobari03@kms-election.com | KarobariAdmin2025! |
| KAROBARI004 | karobari04@kms-election.com | KarobariAdmin2025! |
| KAROBARI005 | karobari05@kms-election.com | KarobariAdmin2025! |

**⚠️ Important**: Change these passwords after first login in production!

## 🚨 Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` in `.env` file
- Ensure database server is running
- Verify credentials are correct

### Migration Fails
- Check if database is accessible
- Verify schema.prisma syntax is correct
- Try `npx prisma migrate reset` (⚠️ this deletes data)

### Seed Fails
- Ensure migration ran successfully first
- Check if admin accounts already exist
- Verify DATABASE_URL is correct

### Login Not Working
- Verify NextAuth is configured correctly
- Check `NEXTAUTH_SECRET` in `.env`
- Verify `NEXTAUTH_URL` matches your domain

## 📝 Notes

- The nomination form stores additional data (office use fields, supporter details) in the `experience` JSON field of the `KarobariCandidate` model
- All form fields match the hard copy form structure
- Zone selection is dynamically loaded from the database
- Forms are validated both client-side and server-side

## 🎯 Quick Start Commands

```bash
# 1. Migrate database
npx prisma migrate dev --name add_karobari_admin

# 2. Seed admin accounts
npm run db:seed

# 3. Generate Prisma Client
npx prisma generate

# 4. Build project
npm run build

# 5. Start development server
npm run dev
```

Then visit: `http://localhost:3000/karobari-admin/login`


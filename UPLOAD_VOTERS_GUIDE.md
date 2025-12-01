# Upload Voters from Excel File Guide

This guide explains how to upload voter data from an Excel file to the database.

## Prerequisites

1. Excel file with voter data (`.xlsx` format)
2. Database connection configured in `.env` file
3. Node.js and dependencies installed

## Excel File Format

Your Excel file should have the following columns (column names are flexible and will be auto-detected):

### Required Columns:
- **Name** (or "Full Name", "Voter Name")
- **Phone** (or "Mobile", "Phone Number", "Mobile Number") - Must be 10 digits
- **Date of Birth** (or "DOB", "Birthdate", "Birth Date") - Format: DD/MM/YYYY or Excel date

### Optional Columns:
- **Gender** (or "Sex") - M/F
- **Email** (or "Email Address")
- **City** (or "Mulgam", "Current City")
- **Region** (or "Zone")
- **Voter ID** (or "ID")

## How to Run

### Option 1: Using npm script (Recommended)

```bash
npm run upload:voters "Sort List 3.1 (Panvel).xlsx"
```

If the file is in the project root and named `Sort List 3.1 (Panvel).xlsx`, you can run:

```bash
npm run upload:voters
```

### Option 2: Direct execution

```bash
npx tsx scripts/upload-voters-from-excel.ts "path/to/your/file.xlsx"
```

## What the Script Does

1. **Reads the Excel file** - Parses the first worksheet
2. **Auto-detects columns** - Maps common column names to database fields
3. **Validates data**:
   - Checks for required fields (name, phone, DOB)
   - Validates phone numbers (must be 10 digits)
   - Validates age (must be 18+)
   - Validates DOB format
4. **Checks for duplicates** - Skips voters with existing phone numbers
5. **Assigns zones automatically**:
   - Yuva Pankh zone (only if age 18-39, and only Karnataka & Goa or Raigad)
   - Trustee zone (if age 18+)
   - Based on region/city
6. **Creates records**:
   - Creates User account
   - Creates Voter profile
   - Links them together

## Zone Assignment Logic

The script automatically assigns zones based on:
- **Region/City**: Maps to appropriate zone codes
- **Age**: Determines eligibility for different election types
- **Yuva Pankh**: Only assigned if age is 18-39, and only for Karnataka & Goa or Raigad zones
- **Trustees**: Assigned if age is 18+

### Region Mapping:
- Mumbai/Panvel → Mumbai zone
- Raigad → Raigad zone
- Karnataka & Goa → Karnataka & Goa zone
- Other regions → Mapped to appropriate zones

## Output

The script will show:
- Number of voters found
- Number of valid voters
- Number of invalid voters (with reasons)
- Number of duplicates (skipped)
- Upload progress
- Final success/error count

## Example Output

```
Reading Excel file: Sort List 3.1 (Panvel).xlsx
Found worksheet: Sheet1
Headers found: ['Name', 'Phone', 'DOB', 'Gender', 'Email', 'City']

Found 150 voters to process

Valid voters: 145
Invalid voters: 5

Invalid voter details:
  - Row 12: Invalid phone number - 12345
  - Row 25: Invalid age (16) - must be 18+
  - Row 30: Missing date of birth
  - Row 45: Invalid phone number - abc123
  - Row 67: Invalid age (17) - must be 18+

⚠️  Found 10 duplicate phone numbers (will be skipped):
  - John Doe (9876543210)
  - Jane Smith (9876543211)
  ...

📤 Uploading 135 voters...
  ✓ Processed 10 voters...
  ✓ Processed 20 voters...
  ...

✅ Upload complete!
   Success: 135
   Errors: 0
   Duplicates skipped: 10
```

## Troubleshooting

### Error: "No worksheet found"
- Make sure your Excel file has at least one worksheet
- Check that the file is not corrupted

### Error: "Missing required fields"
- Ensure your Excel file has columns for Name, Phone, and DOB
- Column names can vary (see supported names above)

### Error: "Invalid phone number"
- Phone numbers must be exactly 10 digits
- Remove any spaces, dashes, or country codes

### Error: "Invalid age"
- All voters must be 18 years or older
- Check DOB format (DD/MM/YYYY)

### Error: "Database connection failed"
- Check your `.env` file has correct `DATABASE_URL`
- Ensure database is running and accessible

## Notes

- The script will **skip duplicate phone numbers** automatically
- Voters are created with **User accounts** for authentication
- **Voter IDs** are auto-generated if not provided in Excel
- **Zones are assigned automatically** based on region and age
- The script processes voters **one by one** to handle errors gracefully

## Support

If you encounter issues:
1. Check the error messages in the console output
2. Verify your Excel file format matches the requirements
3. Ensure database connection is working
4. Check that zones exist in the database



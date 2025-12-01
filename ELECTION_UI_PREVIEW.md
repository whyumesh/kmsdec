# Election Management UI Preview

## Overview
A new admin page has been created at `/admin/elections` to manage election status, including activating the Karobari election.

## UI Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Election Management                                   │
│      Manage election status and settings                     │
│                                                              │
│                                    [← Back to Dashboard]     │
└─────────────────────────────────────────────────────────────┘
```

### Main Content Area

#### Success/Error Messages (Top)
- **Success**: Green banner with checkmark icon
- **Error**: Red banner with alert icon

#### Elections List
Each election is displayed in a card with:

```
┌─────────────────────────────────────────────────────────────┐
│ [Icon] Karobari Members Election 2024      [Status Badge]   │
│        Business committee members for community development │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Type: KAROBARI_MEMBERS                                      │
│ Online Nomination: No                                        │
│ Start Date: December 1, 2024                                │
│ End Date: December 15, 2024                                 │
│ Voter Age Range: No min - No max years                     │
│ Candidate Age Range: 25 - No max years                     │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Change Status                                                │
│ [Set Upcoming] [Activate] [Complete]                        │
│                                                              │
│ ⚠️ Karobari Election Not Active                             │
│    Voters cannot cast votes until this election is set to   │
│    "Active". Click the "Activate" button above to enable.   │
└─────────────────────────────────────────────────────────────┘
```

### Visual Features

1. **Color-Coded Elections**:
   - **Yuva Pankh**: Green theme (🟢)
   - **Karobari Members**: Blue theme (🔵)
   - **Trustees**: Purple theme (🟣)

2. **Status Badges**:
   - **Active**: Green badge with checkmark ✓
   - **Upcoming**: Yellow badge with clock icon ⏰
   - **Completed**: Gray badge with X icon ✗

3. **Status Buttons**:
   - Active button is highlighted in the election's theme color
   - Disabled buttons are grayed out
   - Loading spinner appears when updating

4. **Special Alert for Karobari**:
   - Blue info box appears when Karobari election is not active
   - Explains that voting is disabled until activated

## How to Use

### To Activate Karobari Election:

1. **Navigate to Elections Page**:
   - Go to Admin Dashboard
   - Click "Manage Elections" in Quick Actions
   - Or directly visit `/admin/elections`

2. **Find Karobari Election Card**:
   - Look for the blue-themed card with Building icon
   - Current status will be shown in the badge

3. **Click "Activate" Button**:
   - The button will show a loading spinner
   - Success message will appear at the top
   - Status badge will change to green "Active"
   - Alert box will disappear

4. **Verify Activation**:
   - Status badge should show "Active" (green)
   - "Activate" button will be disabled
   - Special alert box will be gone

## Button States

### When Election is Upcoming:
- [Set Upcoming] - **Disabled** (current state)
- [Activate] - **Enabled** (click to activate)
- [Complete] - **Enabled**

### When Election is Active:
- [Set Upcoming] - **Enabled**
- [Activate] - **Disabled** (current state, highlighted)
- [Complete] - **Enabled**

### When Election is Completed:
- [Set Upcoming] - **Enabled**
- [Activate] - **Enabled**
- [Complete] - **Disabled** (current state)

## Responsive Design

- **Desktop**: Full-width cards with side-by-side information
- **Tablet**: Stacked layout with responsive grid
- **Mobile**: Single column, full-width cards

## Access Control

- Requires admin authentication
- Shows "Access Denied" page if not logged in as admin
- Redirects to login if authentication fails

## Integration Points

1. **Admin Dashboard**: "Manage Elections" button in Quick Actions
2. **API Endpoint**: `/api/admin/elections` (GET and PATCH)
3. **Voting System**: Checks election status before allowing votes


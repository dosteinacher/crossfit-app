# How to Import Workouts from Excel/CSV

## Quick Start

1. **Prepare your Excel file** with these columns:
   - **Title** (required) - Workout name
   - **Description** (optional) - Workout details, movements, etc.
   - **Type** (optional) - Workout type (default: "General")
   - **Date** (required) - Workout date (YYYY-MM-DD or MM/DD/YYYY)
   - **Time** (optional) - Workout time (HH:MM or HH:MM AM/PM, default: 09:00)
   - **Max Participants** (optional) - Maximum capacity (default: 20)

2. **Save your file** as `.xlsx` or `.csv` format

3. **Run the import script**:
   ```bash
   cd /Users/dominiksteinacher/Documents/crossfit-app
   node import-workouts.mjs your-workouts.xlsx
   ```

## Excel Template

I've created a template file for you: `workouts-template.csv`

You can:
- Open it in Excel or Google Sheets
- Copy/paste your existing workout data
- Save it and import

## Supported Workout Types

- General
- Strength
- Cardio
- HIIT
- Mobility
- Olympic Lifting
- Gymnastics

## Date Formats Supported

- `2024-01-15` (YYYY-MM-DD)
- `01/15/2024` (MM/DD/YYYY)
- `15/01/2024` (DD/MM/YYYY)
- Excel date numbers (automatic)

## Time Formats Supported

- `06:00` (24-hour)
- `6:00 AM` (12-hour with AM/PM)
- `18:30` (24-hour)
- `6:30 PM` (12-hour with AM/PM)

## Example Excel File

| Title | Description | Type | Date | Time | Max Participants |
|-------|-------------|------|------|------|------------------|
| Monday Morning WOD | For Time: 21-15-9 Thrusters, Pull-ups | HIIT | 2024-01-15 | 06:00 | 20 |
| Wednesday Strength | 5 Rounds: 5 Back Squats (Heavy) | Strength | 2024-01-17 | 07:00 | 15 |
| Friday Partner WOD | AMRAP 20 minutes... | General | 2024-01-19 | 17:30 | 24 |

## Important Notes

⚠️ **Development Mode**: Since you're running in development mode with an in-memory database, imported workouts will be lost when the server restarts. For permanent storage, you'll need to deploy to Cloudflare with D1 database.

## Steps to Import

1. **Prepare your Excel file** with your old workouts
2. **Save it** in the `crossfit-app` folder (or note the full path)
3. **Stop the dev server** temporarily (or keep it running - it won't interfere)
4. **Run the import**:
   ```bash
   node import-workouts.mjs workouts.xlsx
   ```
5. **Refresh your browser** to see the imported workouts!

## Troubleshooting

- **"Cannot find module"** - Make sure you're in the crossfit-app directory
- **"File not found"** - Check the file path and name
- **"Invalid date"** - Check date format matches one of the supported formats
- **Empty workouts** - Check that column names match exactly (Title, Description, Type, Date, Time)

## Need Help?

Let me know if you have any issues with the import!

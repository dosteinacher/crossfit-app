// Script to import workouts from Excel file
import * as XLSX from 'xlsx';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Excel format expected:
// | Title | Description | Type | Date | Time | Max Participants |
// Date format: YYYY-MM-DD or MM/DD/YYYY
// Time format: HH:MM (24-hour) or HH:MM AM/PM

async function importWorkouts(excelFilePath) {
  try {
    console.log('📊 Reading Excel file:', excelFilePath);
    console.log('');
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} workouts to import\n`);
    
    // Generate curl commands to create workouts via API
    console.log('Copy and paste these commands to import workouts:\n');
    console.log('---\n');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Parse the row data
        const title = row.Title || row.title || `Workout ${i + 1}`;
        const description = row.Description || row.description || '';
        const workoutType = row.Type || row.type || 'General';
        const dateStr = row.Date || row.date;
        const timeStr = row.Time || row.time || '09:00';
        const maxParticipants = parseInt(row['Max Participants'] || row.max_participants || row.MaxParticipants || 20);
        
        // Parse date and time
        let dateTime;
        
        if (typeof dateStr === 'number') {
          // Excel date serial number
          const excelDate = XLSX.SSF.parse_date_code(dateStr);
          dateTime = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
        } else {
          // String date
          dateTime = new Date(dateStr);
        }
        
        // Parse time and combine with date
        if (timeStr) {
          const timeMatch = timeStr.toString().match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const meridiem = timeMatch[3];
            
            if (meridiem && meridiem.toUpperCase() === 'PM' && hours !== 12) {
              hours += 12;
            } else if (meridiem && meridiem.toUpperCase() === 'AM' && hours === 12) {
              hours = 0;
            }
            
            dateTime.setHours(hours, minutes, 0, 0);
          }
        }
        
        // Output as curl command
        const payload = {
          title: title,
          description: description,
          workout_type: workoutType,
          date: dateTime.toISOString(),
          max_participants: maxParticipants
        };
        
        console.log(`# ${i + 1}. ${title}`);
        console.log(`curl -X POST http://localhost:3000/api/workouts \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -H "Cookie: $(cat ~/.cursor/crossfit-cookie 2>/dev/null || echo '')" \\`);
        console.log(`  -d '${JSON.stringify(payload)}'`);
        console.log('');
        
      } catch (error) {
        console.error(`# Error parsing row ${i + 1}:`, error.message);
        console.log('');
      }
    }
    
    console.log('---\n');
    console.log(`✓ Generated ${data.length} import commands`);
    console.log('\n💡 TIP: You can also use the web interface to create workouts!');
    console.log('   Just copy the data from Excel and paste into the form.\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node import-workouts.mjs <path-to-excel-file.xlsx>');
  console.error('Example: node import-workouts.mjs workouts.xlsx');
  process.exit(1);
}

importWorkouts(filePath);

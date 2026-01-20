'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import * as XLSX from 'xlsx';

export default function ImportWorkoutsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState<{ success: number; failed: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess('');
      setStats(null);
    }
  };

  const parseDateTime = (dateStr: any, timeStr: any): string => {
    let dateTime: Date;

    // Parse date
    if (typeof dateStr === 'number') {
      // Excel date serial number
      const excelDate = XLSX.SSF.parse_date_code(dateStr);
      dateTime = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
    } else {
      dateTime = new Date(dateStr);
    }

    // Parse time
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

    return dateTime.toISOString();
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    setStats(null);

    try {
      // Read the file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let failedCount = 0;

      // Import each workout
      for (let i = 0; i < rows.length; i++) {
        const row: any = rows[i];

        try {
          const title = row.Title || row.title || `Workout ${i + 1}`;
          const description = row.Description || row.description || '';
          const workoutType = row.Type || row.type || 'General';
          const dateStr = row.Date || row.date;
          const timeStr = row.Time || row.time || '09:00';
          const maxParticipants = parseInt(
            row['Max Participants'] || row.max_participants || row.MaxParticipants || '20'
          );

          const dateTime = parseDateTime(dateStr, timeStr);

          const response = await fetch('/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              workout_type: workoutType,
              date: dateTime,
              max_participants: maxParticipants,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
            console.error(`Failed to import: ${title}`);
          }
        } catch (err) {
          failedCount++;
          console.error(`Error importing row ${i + 1}:`, err);
        }
      }

      setStats({ success: successCount, failed: failedCount });

      if (successCount > 0) {
        setSuccess(
          `Successfully imported ${successCount} workout${successCount > 1 ? 's' : ''}!`
        );
        if (failedCount === 0) {
          setTimeout(() => router.push('/workouts'), 2000);
        }
      } else {
        setError('Failed to import any workouts. Please check your file format.');
      }
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-gray-800">Import Workouts</h1>

          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Excel/CSV File</h2>

            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}

            {stats && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">Import Results:</h3>
                <p className="text-green-600">✓ Success: {stats.success} workouts</p>
                {stats.failed > 0 && (
                  <p className="text-red-600">✗ Failed: {stats.failed} workouts</p>
                )}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (Excel or CSV)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={handleImport} disabled={!file || importing} className="flex-1">
                {importing ? 'Importing...' : 'Import Workouts'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.back()}
                disabled={importing}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4 text-gray-800">File Format Instructions</h2>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Your Excel/CSV file should have these columns:
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Column</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Required?</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Title</td>
                      <td className="border border-gray-300 px-4 py-2 text-red-600">
                        ✅ Required
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        "Monday Morning WOD"
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        Description
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Optional</td>
                      <td className="border border-gray-300 px-4 py-2">
                        "For Time: 21-15-9..."
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Type</td>
                      <td className="border border-gray-300 px-4 py-2">Optional</td>
                      <td className="border border-gray-300 px-4 py-2">
                        "HIIT", "Strength", etc.
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Date</td>
                      <td className="border border-gray-300 px-4 py-2 text-red-600">
                        ✅ Required
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        "2024-01-15" or "01/15/2024"
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Time</td>
                      <td className="border border-gray-300 px-4 py-2">Optional (default: 09:00)</td>
                      <td className="border border-gray-300 px-4 py-2">
                        "06:00" or "6:00 AM"
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        Max Participants
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        Optional (default: 20)
                      </td>
                      <td className="border border-gray-300 px-4 py-2">20</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2">📥 Download Template</h3>
              <p className="text-gray-700 mb-3">
                Want to see an example? Download our template with sample workouts:
              </p>
              <a
                href="/workouts-template.csv"
                download
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Download Template CSV
              </a>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

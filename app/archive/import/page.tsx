'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import * as XLSX from 'xlsx';

export default function ImportArchivePage() {
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

  const extractWorkouts = async (data: any[]) => {
    const workouts: any[] = [];
    let counter = 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Extract Team of 2 workouts (column E, index 4)
      if (row[4] && row[4].trim()) {
        workouts.push({
          title: `Team of 2 #${counter++}`,
          description: row[4].trim(),
          category: 'Team of 2',
          workout_type: 'General',
        });
      }

      // Extract Solo workouts (column F, index 5)
      if (row[5] && row[5].trim()) {
        workouts.push({
          title: `Solo Workout #${counter++}`,
          description: row[5].trim(),
          category: 'Solo',
          workout_type: 'HIIT',
        });
      }

      // Extract Team of 3 workouts (column G, index 6)
      if (row[6] && row[6].trim()) {
        workouts.push({
          title: `Team of 3 #${counter++}`,
          description: row[6].trim(),
          category: 'Team of 3',
          workout_type: 'General',
        });
      }
    }

    return workouts;
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
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const workouts = await extractWorkouts(rows);

      let successCount = 0;
      let failedCount = 0;

      for (const workout of workouts) {
        try {
          const response = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workout),
          });

          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          failedCount++;
        }

        // Small delay to avoid overwhelming
        if (successCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setStats({ success: successCount, failed: failedCount });

      if (successCount > 0) {
        setSuccess(
          `Successfully imported ${successCount} workout template${successCount > 1 ? 's' : ''} to your archive!`
        );
        setTimeout(() => router.push('/archive'), 2000);
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
          <h1 className="text-4xl font-bold mb-8 text-gray-800">Import to Workout Archive</h1>

          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Your Excel File</h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-800 mb-2">📚 What This Does:</h3>
              <p className="text-gray-700">
                This imports workouts from your Excel columns (Team of 2, Solo Workout, Team of 3) 
                into your <strong>Workout Archive</strong> - a library of workout templates you can reuse anytime!
              </p>
              <p className="text-gray-700 mt-2">
                <strong>No dates needed!</strong> These are just templates for future use.
              </p>
            </div>

            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}

            {stats && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">✅ Import Complete!</h3>
                <p className="text-green-600 text-lg">Imported: {stats.success} workout templates</p>
                {stats.failed > 0 && (
                  <p className="text-orange-600">Skipped: {stats.failed} (empty cells)</p>
                )}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Excel File
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
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
                {importing ? `Importing... (${stats?.success || 0} done)` : 'Import to Archive'}
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
            <h2 className="text-xl font-bold mb-4 text-gray-800">How This Works</h2>

            <div className="space-y-4 text-gray-700">
              <p>The import extracts workouts from these columns in your Excel:</p>

              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Column E</strong> - "Team of 2" workouts</li>
                <li><strong>Column F</strong> - "Solo Workout" workouts</li>
                <li><strong>Column G</strong> - "Team of 3" workouts</li>
              </ul>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h3 className="font-bold text-green-800 mb-2">✨ After Import:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All workouts saved as templates in your archive</li>
                  <li>Browse them anytime in the "Archive" page</li>
                  <li>When creating a workout, pick a template and schedule it!</li>
                  <li>Edit templates as needed</li>
                  <li>New workouts you create are auto-saved to archive</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

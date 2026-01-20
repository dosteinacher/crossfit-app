'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import * as XLSX from 'xlsx';

export default function ImportCustomPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [stats, setStats] = useState<{ success: number; failed: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setSuccess('');
      setStats(null);

      // Preview the data
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Parse first few rows for preview
        const previewData = rows.slice(0, 5).map((row: any) => ({
          dateTime: row[0],
          warmUp: row[2],
          strength: row[3],
          teamOf2: row[4],
          solo: row[5],
          teamOf3: row[6],
        }));

        setPreview(previewData);
      } catch (err) {
        console.error('Preview error:', err);
      }
    }
  };

  const parseDateTime = (dateTimeStr: string): string => {
    // Format: "19.01 00:00" (DD.MM HH:MM)
    // Assume current year if not specified
    const year = new Date().getFullYear();
    
    const match = dateTimeStr.match(/(\d+)\.(\d+)\s+(\d+):(\d+)/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // JS months are 0-based
      const hour = parseInt(match[3]);
      const minute = parseInt(match[4]);
      
      const date = new Date(year, month, day, hour, minute);
      return date.toISOString();
    }
    
    return new Date().toISOString();
  };

  const buildDescription = (warmUp: string, strength: string, teamOf2: string, solo: string, teamOf3: string): string => {
    let desc = '';
    
    if (warmUp && warmUp.trim()) {
      desc += '**WARM-UP**\n' + warmUp.trim() + '\n\n';
    }
    
    if (strength && strength.trim()) {
      desc += '**STRENGTH**\n' + strength.trim() + '\n\n';
    }
    
    if (teamOf2 && teamOf2.trim()) {
      desc += '**TEAM OF 2**\n' + teamOf2.trim() + '\n\n';
    }
    
    if (solo && solo.trim()) {
      desc += '**SOLO WORKOUT**\n' + solo.trim() + '\n\n';
    }
    
    if (teamOf3 && teamOf3.trim()) {
      desc += '**TEAM OF 3**\n' + teamOf3.trim() + '\n\n';
    }
    
    return desc.trim();
  };

  const determineType = (warmUp: string, strength: string, teamOf2: string, solo: string, teamOf3: string): string => {
    if (strength && strength.trim()) return 'Strength';
    if (teamOf2 && teamOf2.trim()) return 'General';
    if (teamOf3 && teamOf3.trim()) return 'General';
    if (solo && solo.trim()) return 'HIIT';
    return 'General';
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

      let successCount = 0;
      let failedCount = 0;

      // Skip header row (row 0)
      for (let i = 1; i < rows.length; i++) {
        const row: any = rows[i];

        try {
          const dateTimeStr = row[0];
          
          // Skip if no date/time
          if (!dateTimeStr) {
            continue;
          }

          const warmUp = row[2] || '';
          const strength = row[3] || '';
          const teamOf2 = row[4] || '';
          const solo = row[5] || '';
          const teamOf3 = row[6] || '';

          // Skip if all workout columns are empty
          if (!warmUp && !strength && !teamOf2 && !solo && !teamOf3) {
            continue;
          }

          const dateTime = parseDateTime(dateTimeStr.toString());
          const description = buildDescription(warmUp, strength, teamOf2, solo, teamOf3);
          const workoutType = determineType(warmUp, strength, teamOf2, solo, teamOf3);
          
          // Create a title from the date
          const date = new Date(dateTime);
          const title = `Workout ${date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`;

          const response = await fetch('/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              workout_type: workoutType,
              date: dateTime,
              max_participants: 20,
            }),
          });

          if (response.ok) {
            successCount++;
            console.log(`✓ Imported: ${title}`);
          } else {
            failedCount++;
            console.error(`✗ Failed to import: ${title}`);
          }
        } catch (err) {
          failedCount++;
          console.error(`Error importing row ${i + 1}:`, err);
        }

        // Add a small delay to avoid overwhelming the server
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setStats({ success: successCount, failed: failedCount });

      if (successCount > 0) {
        setSuccess(
          `Successfully imported ${successCount} workout${successCount > 1 ? 's' : ''}!`
        );
        setTimeout(() => router.push('/workouts'), 2000);
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
          <h1 className="text-4xl font-bold mb-8 text-gray-800">Import Your Crossfit Workouts</h1>

          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Your Excel File</h2>

            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}

            {stats && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">Import Results:</h3>
                <p className="text-green-600 text-lg">✓ Success: {stats.success} workouts imported!</p>
                {stats.failed > 0 && (
                  <p className="text-orange-600">⚠ Skipped: {stats.failed} rows</p>
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

            {preview.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">Preview (first few rows):</h3>
                <div className="space-y-2 text-sm">
                  {preview.map((row, idx) => (
                    <div key={idx} className="border-b border-gray-200 pb-2">
                      <p className="font-medium text-blue-600">{row.dateTime}</p>
                      {row.warmUp && <p className="text-gray-600 text-xs">Warm-up: {row.warmUp.substring(0, 50)}...</p>}
                      {row.strength && <p className="text-gray-600 text-xs">Strength: {row.strength.substring(0, 50)}...</p>}
                      {row.teamOf2 && <p className="text-gray-600 text-xs">Team of 2: {row.teamOf2.substring(0, 50)}...</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={handleImport} disabled={!file || importing} className="flex-1">
                {importing ? `Importing... (${stats?.success || 0} done)` : 'Import All Workouts'}
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
            <h2 className="text-xl font-bold mb-4 text-gray-800">How This Import Works</h2>

            <div className="space-y-4 text-gray-700">
              <p>
                This import tool is designed specifically for your Excel format with columns:
              </p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Date Time</strong> - Workout date and time (e.g., "19.01 00:00")</li>
                <li><strong>Crossfitters</strong> - Participant names (for reference)</li>
                <li><strong>Warm Up</strong> - Warm-up exercises</li>
                <li><strong>Strength</strong> - Strength work</li>
                <li><strong>Team of 2</strong> - Partner workouts</li>
                <li><strong>Solo Workout</strong> - Individual WODs</li>
                <li><strong>Team of 3</strong> - Team workouts</li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h3 className="font-bold text-blue-800 mb-2">📋 What Happens:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Each row becomes one workout</li>
                  <li>All sections (Warm Up, Strength, etc.) are combined into the description</li>
                  <li>Workout type is determined automatically (Strength, HIIT, or General)</li>
                  <li>Title is auto-generated from the date (e.g., "Workout Jan 19, 06:00")</li>
                  <li>Max participants is set to 20 (you can edit later)</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h3 className="font-bold text-green-800 mb-2">✅ Tips:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Make sure your Excel has the same column structure as shown above</li>
                  <li>Empty rows will be skipped automatically</li>
                  <li>You can edit any workout after import</li>
                  <li>The import may take a minute for large files - be patient!</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

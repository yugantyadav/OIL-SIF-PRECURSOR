'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react';

interface UploadZoneProps {
  onAnalyzeComplete: (report: any) => void;
  onBulkComplete: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function UploadZone({ onAnalyzeComplete, onBulkComplete, loading, setLoading, setError }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    // Preview first 5 rows
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
        });
        setPreviewRows(rows);
      } catch (err) {
        setError('Failed to parse CSV');
      }
    };
    reader.readAsText(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreviewRows([]);
    setBatchId(null);
  };

  const uploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload
      const uploadRes = await fetch(`${API_URL}/api/reports/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      setBatchId(uploadData.batch_id);

      // Analyze batch
      const analyzeRes = await fetch(`${API_URL}/api/reports/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ batch_id: uploadData.batch_id }),
      });
      if (!analyzeRes.ok) throw new Error('Analysis failed');
      await analyzeRes.json();

      onBulkComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Single Report Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyze Single Report</h3>
        <AnalyzeSingleForm
          onComplete={onAnalyzeComplete}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
        />
      </div>

      {/* Bulk CSV Upload */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk CSV Upload</h3>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={removeFile} className="text-gray-400 hover:text-danger-600">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {previewRows.length > 0 && (
                <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        {Object.keys(previewRows[0]).map(key => (
                          <th key={key} className="pb-2">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-gray-200">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="py-2 text-gray-700 max-w-xs truncate">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">Showing first 5 rows</p>
                </div>
              )}

              <button
                onClick={uploadAndAnalyze}
                disabled={loading || !file}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  'Upload & Analyze All Reports'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-12 h-12 mx-auto text-gray-400" />
              <p className="text-gray-600">Drag & drop a CSV file here, or click to browse</p>
              <p className="text-sm text-gray-400">Required columns: report_id, narrative</p>
              <p className="text-sm text-gray-400">Optional: report_date, site, activity, report_type</p>
              <input
                type="file"
                accept=".csv"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="btn-primary inline-block">
                Choose File
              </label>
            </div>
          )}
        </div>

        {batchId && (
          <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-center gap-2 text-success-700">
              <CheckCircle className="w-5 h-5" />
              <span>Batch uploaded successfully! ID: <code className="bg-white px-2 py-0.5 rounded">{batchId}</code></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
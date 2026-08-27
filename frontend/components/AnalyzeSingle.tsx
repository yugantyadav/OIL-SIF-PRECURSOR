'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Sparkles, FileText } from 'lucide-react';

interface AnalyzeSingleProps {
  onComplete: (report: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AnalyzeSingle({ onComplete, loading, setLoading, setError }: AnalyzeSingleProps) {
  const [narrative, setNarrative] = useState('');
  const [site, setSite] = useState('');
  const [activity, setActivity] = useState('');
  const [result, setResult] = useState<any>(null);

  const exampleReports = [
    {
      label: 'Confined Space - No Gas Test',
      narrative: 'Worker entered storage tank T-101 without gas testing. Oxygen level not verified. No confined space permit obtained. H2S smell detected.',
      site: 'GGS-II Duliajan',
      activity: 'Tank cleaning',
    },
    {
      label: 'Energy Isolation - LOTO Missing',
      narrative: 'Mechanic started pump P-205 maintenance without lockout-tagout. Isolation certificate not verified. Stored pressure in discharge line.',
      site: 'Drill Site #7',
      activity: 'Pump maintenance',
    },
    {
      label: 'Line of Fire - Suspended Load',
      narrative: 'Rigger positioned under suspended load during valve replacement. Crane operator unaware. Load shifted unexpectedly. Near miss.',
      site: 'Pipeline ROW Duliajan-Madhuban',
      activity: 'Valve replacement',
    },
  ];

  const handleAnalyze = async () => {
    if (!narrative.trim()) {
      setError('Please enter a report narrative');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative, site, activity }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data);

      // Create a report object for the table
      const newReport = {
        id: crypto.randomUUID(),
        report_id: `MANUAL-${Date.now()}`,
        site,
        activity,
        report_type: 'NearMiss',
        sif_flag: data.sif.sif_flag,
        sif_probability: data.sif.sif_probability,
        lsr_tags: data.lsr_tags.map((t: any) => t.rule_name),
      };
      onComplete(newReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (ex: typeof exampleReports[0]) => {
    setNarrative(ex.narrative);
    setSite(ex.site);
    setActivity(ex.activity);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Paste Safety Report</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site / Location</label>
            <input
              type="text"
              value={site}
              onChange={e => setSite(e.target.value)}
              placeholder="e.g., Drill Site #7, GGS-II Duliajan"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <input
              type="text"
              value={activity}
              onChange={e => setActivity(e.target.value)}
              placeholder="e.g., Valve replacement, Tank cleaning"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Narrative *</label>
            <textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              placeholder="Describe the unsafe act, unsafe condition, or near-miss..."
              rows={6}
              className="input-field resize-y font-mono text-sm"
            />
          </div>

          {/* Example buttons */}
          <div>
            <span className="text-sm text-gray-500">Quick examples:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {exampleReports.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => loadExample(ex)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !narrative.trim()}
            className="btn-primary w-full sm:w-auto"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Analyze with AI
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Analysis Result</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              result.sif.sif_flag ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700'
            }`}>
              {result.sif.sif_flag ? (
                <> <AlertTriangle className="w-3 h-3 inline mr-1" /> SIF-POTENTIAL </>)
              : (
                <> <CheckCircle className="w-3 h-3 inline mr-1" /> NON-SIF </>
              )}
            </span>
          </div>

          {/* SIF Probability */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">SIF Probability</span>
              <span className="text-lg font-bold text-gray-900">{(result.sif.sif_probability * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success-500 via-yellow-500 to-danger-500"
                style={{ width: `${Math.round(result.sif.sif_probability * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Confidence: {result.sif.confidence_level}</p>
          </div>

          {/* Explanation */}
          {result.sif.explanation_snippets.length > 0 && (
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <h4 className="text-sm font-medium text-primary-800 mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Why flagged:
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.sif.explanation_snippets.map((snip: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm font-mono text-xs">
                    {snip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* LSR Tags */}
          {result.lsr_tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">IOGP Life-Saving Rules</h4>
              <div className="flex flex-wrap gap-2">
                {result.lsr_tags.map((tag: any, i: number) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      tag.confidence > 0.7 ? 'bg-danger-100 text-danger-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {tag.rule_name} {(tag.confidence * 100).toFixed(0)}%
                    {tag.matched_keywords.length > 0 && (
                      <span className="ml-1 text-[10px] opacity-75">({tag.matched_keywords.slice(0, 2).join(', ')})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {result.entities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Entities</h4>
              <div className="flex flex-wrap gap-2">
                {result.entities.map((ent: any, i: number) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ent.entity_type === 'barrier_failure' ? 'bg-danger-100 text-danger-700' :
                      ent.entity_type === 'activity' ? 'bg-primary-100 text-primary-700' :
                      ent.entity_type === 'location' ? 'bg-success-100 text-success-700' :
                      ent.entity_type === 'equipment' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ent.entity_type}: {ent.entity_value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
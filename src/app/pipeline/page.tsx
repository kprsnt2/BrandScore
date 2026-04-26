"use client";

import { useState, useEffect } from 'react';
import BrandDashboard from '@/components/BrandDashboard';

export default function PipelinePage() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load pre-computed results on mount
  useEffect(() => {
    async function loadResults() {
      try {
        const response = await fetch('/data/latest-results.json');
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setResults(data.results);
            setLastUpdated(data.timestamp || null);
          }
        }
      } catch (error) {
        console.log('No pre-computed results available');
      }
    }
    loadResults();
  }, []);

  const handleRunIndustry = async (industryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pipeline/industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: industryId }),
      });

      if (!response.ok) throw new Error('Pipeline request failed');

      const result = await response.json();
      setResults(prev => {
        const existingIndex = prev.findIndex(r => r.industry?.id === industryId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = result;
          return updated;
        }
        return [...prev, result];
      });
    } catch (error) {
      console.error('Error running industry pipeline:', error);
      alert('Failed to run industry pipeline. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAllIndustries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pipeline/all-industries', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Full pipeline request failed');

      const result = await response.json();
      setResults(result.results || []);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Error running full pipeline:', error);
      alert('Failed to run full pipeline. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BrandDashboard
      results={results}
      isLoading={isLoading}
      lastUpdated={lastUpdated}
      onRunIndustry={handleRunIndustry}
      onRunAllIndustries={handleRunAllIndustries}
    />
  );
}

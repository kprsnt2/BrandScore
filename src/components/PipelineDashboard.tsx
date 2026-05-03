"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface IndustryResult {
  industry: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
  brandResults: Array<{
    brand: string;
    score: number;
    breakdown: {
      recommendation: number;
      sentiment: number;
      prominence: number;
      accuracy: number;
    };
    error?: string;
  }>;
  industryAverage: {
    score: number;
    recommendation: number;
    sentiment: number;
    prominence: number;
    accuracy: number;
  };
  topPerformers: any[];
  bottomPerformers: any[];
  error?: string;
}

interface PipelineDashboardProps {
  results?: IndustryResult[];
  isLoading?: boolean;
  onRunIndustry?: (industryId: string) => void;
  onRunAllIndustries?: () => void;
}

export default function PipelineDashboard({ 
  results = [], 
  isLoading = false,
  onRunIndustry,
  onRunAllIndustries 
}: PipelineDashboardProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  const industries = [
    { id: 'technology', name: 'Technology' },
    { id: 'automotive', name: 'Automotive' },
    { id: 'ecommerce', name: 'Retail & E-Commerce' },
    { id: 'fashion', name: 'Fashion & Apparel' },
    { id: 'food-beverage', name: 'Food & Beverage' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'finance', name: 'Finance & Banking' },
    { id: 'telecom', name: 'Telecommunications' },
    { id: 'entertainment', name: 'Entertainment & Media' },
    { id: 'travel', name: 'Travel & Hospitality' },
    { id: 'energy', name: 'Energy' },
    { id: 'fmcg', name: 'Consumer Goods' },
    { id: 'realestate', name: 'Real Estate' },
    { id: 'edtech', name: 'EdTech' },
    { id: 'logistics', name: 'Logistics' },
    { id: 'consumer-electronics', name: 'Consumer Electronics' },
    { id: 'mobile-phones', name: 'Mobile Phones' },
    { id: 'home-appliances', name: 'Home Appliances' },
    { id: 'two-wheelers', name: 'Two Wheelers' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const overallStats = results.reduce((acc, result) => {
    const validBrands = result.brandResults.filter(b => !b.error);
    return {
      totalIndustries: acc.totalIndustries + 1,
      totalBrands: acc.totalBrands + validBrands.length,
      avgScore: acc.avgScore + (validBrands.length > 0 ? 
        validBrands.reduce((sum, b) => sum + b.score, 0) / validBrands.length : 0),
      completedIndustries: acc.completedIndustries + (result.error ? 0 : 1)
    };
  }, { totalIndustries: 0, totalBrands: 0, avgScore: 0, completedIndustries: 0 });

  overallStats.avgScore = overallStats.totalIndustries > 0 ? 
    Math.round(overallStats.avgScore / results.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Industry Brand Analysis Pipeline
          </h1>
          <p className="text-gray-600">
            Automated analysis of top brands across 19 industries
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Industry
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Choose an industry...</option>
                {industries.map(industry => (
                  <option key={industry.id} value={industry.id}>
                    {industry.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => selectedIndustry && onRunIndustry?.(selectedIndustry)}
                disabled={!selectedIndustry || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Analyzing...' : 'Run Industry'}
              </button>
              
              <button
                onClick={onRunAllIndustries}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Running...' : 'Run All Industries'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 rounded-md ${viewMode === 'overview' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 rounded-md ${viewMode === 'detailed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Overall Statistics */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-2xl font-bold text-gray-900">
                {overallStats.completedIndustries}/{overallStats.totalIndustries}
              </div>
              <div className="text-sm text-gray-600">Industries Completed</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-2xl font-bold text-gray-900">
                {overallStats.totalBrands}
              </div>
              <div className="text-sm text-gray-600">Brands Analyzed</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className={`text-2xl font-bold ${getScoreColor(overallStats.avgScore)}`}>
                {overallStats.avgScore}
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((overallStats.completedIndustries / overallStats.totalIndustries) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
          </div>
        )}

        {/* Results */}
        {viewMode === 'overview' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result, index) => (
              <motion.div
                key={result.industry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {result.industry.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {result.industry.description}
                    </p>
                  </div>
                  {result.error && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                      Error
                    </span>
                  )}
                </div>

                {!result.error && (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Industry Score
                        </span>
                        <span className={`text-lg font-bold ${getScoreColor(result.industryAverage.score)}`}>
                          {result.industryAverage.score}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getScoreBgColor(result.industryAverage.score)}`}
                          style={{ width: `${result.industryAverage.score}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Top Brand: </span>
                        <span className="font-medium">
                          {result.topPerformers[0]?.brand || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Rate: </span>
                        <span className="font-medium">
                          {Math.round((result.brandResults.filter(b => !b.error).length / result.brandResults.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((result) => (
              <div key={result.industry.id} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {result.industry.name} - Detailed Results
                </h3>

                {!result.error ? (
                  <>
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-800 mb-3">Industry Overview</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(result.industryAverage.score)}`}>
                            {result.industryAverage.score}
                          </div>
                          <div className="text-sm text-gray-600">Overall Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.industryAverage.recommendation}
                          </div>
                          <div className="text-sm text-gray-600">Recommendation</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {result.industryAverage.sentiment}
                          </div>
                          <div className="text-sm text-gray-600">Sentiment</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {result.industryAverage.prominence}
                          </div>
                          <div className="text-sm text-gray-600">Prominence</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {result.industryAverage.accuracy}
                          </div>
                          <div className="text-sm text-gray-600">Accuracy</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-800 mb-3">Brand Rankings</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Brand
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Recommendation
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sentiment
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {result.brandResults
                              .filter(b => !b.error)
                              .sort((a, b) => b.score - a.score)
                              .map((brand, index) => (
                                <tr key={brand.brand}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    #{index + 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {brand.brand}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`text-sm font-bold ${getScoreColor(brand.score)}`}>
                                      {brand.score}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {brand.breakdown.recommendation}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {brand.breakdown.sentiment}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-red-600">
                    Analysis failed: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Running pipeline analysis...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">
              No analysis results yet
            </div>
            <p className="text-gray-600">
              Select an industry or run all industries to start the pipeline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

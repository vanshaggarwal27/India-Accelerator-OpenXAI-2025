"use client";

import { useState } from "react";

interface ViralAnalysis {
  viralScore: number;
  verdict: string;
  description: string;
  platformScores: {
    instagram: number;
    tiktok: number;
    linkedin: number;
    twitter: number;
  };
  trendingElements: string[];
  improvements: string[];
  hashtags: string[];
  bestPostingTime: string;
  fullResponse: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ViralAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getViralColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    if (score >= 40) return "text-orange-600";
    return "text-rose-600";
  };

  const getViralIndicator = (score: number) => {
    if (score >= 80) return "★★★";
    if (score >= 60) return "★★";
    if (score >= 40) return "★";
    return "○";
  };

  const ProgressBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className={`${color} font-semibold`}>{score}%</span>
      </div>
      <div className="w-full bg-blue-100 rounded-full h-3 border border-blue-200">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${color.replace('text-', 'bg-')} shadow-sm`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-slate-800 mb-2 drop-shadow-sm">
            VIRAL OR VILE
          </h1>
          <p className="text-xl text-slate-600">AI-Powered Social Media Success Predictor</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Upload Your Content</h2>

            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center mb-4 bg-blue-50/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer block"
              >
                <div className="text-slate-700">
                  <svg className="mx-auto h-12 w-12 mb-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium">Drop your content here</p>
                  <p className="text-sm text-slate-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </label>
            </div>

            {preview && (
              <div className="text-center mb-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-64 object-cover rounded-lg mx-auto border-2 border-blue-200 shadow-md"
                />
                <p className="text-sm text-slate-600 mt-2 font-medium">{selectedFile?.name}</p>
              </div>
            )}

            {selectedFile && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Analyzing Viral Potential...
                  </div>
                ) : "Predict Viral Success"}
              </button>
            )}

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mt-4">
                {error}
              </div>
            )}
          </div>

          {/* Results Dashboard */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-200">
            {result ? (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Viral Analysis Report</h2>

                {/* Main Viral Score */}
                <div className="text-center mb-8 p-6 bg-blue-50/70 rounded-lg border border-blue-100">
                  <div className={`text-8xl font-bold mb-2 ${getViralColor(result.viralScore)}`}>
                    {getViralIndicator(result.viralScore)} {result.viralScore}%
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-2">
                    {result.viralScore >= 70 ? "VIRAL POTENTIAL" : result.viralScore >= 40 ? "MODERATE REACH" : "NEEDS WORK"}
                  </div>
                  <p className="text-slate-600">{result.description}</p>
                </div>

                {/* Platform Scores */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Platform-Specific Scores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <ProgressBar label="Instagram" score={result.platformScores?.instagram || 0} color={getViralColor(result.platformScores?.instagram || 0)} />
                    <ProgressBar label="TikTok" score={result.platformScores?.tiktok || 0} color={getViralColor(result.platformScores?.tiktok || 0)} />
                    <ProgressBar label="LinkedIn" score={result.platformScores?.linkedin || 0} color={getViralColor(result.platformScores?.linkedin || 0)} />
                    <ProgressBar label="Twitter" score={result.platformScores?.twitter || 0} color={getViralColor(result.platformScores?.twitter || 0)} />
                  </div>
                </div>

                {/* Trending Elements */}
                {result.trendingElements && result.trendingElements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Trending Elements Detected</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.trendingElements.map((element, index) => (
                        <span key={index} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm border border-emerald-200">
                          {element}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {result.improvements && result.improvements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">AI Suggestions</h3>
                    <div className="space-y-2">
                      {result.improvements.map((improvement, index) => (
                        <div key={index} className="bg-blue-100 text-blue-800 p-3 rounded-lg text-sm border border-blue-200">
                          {improvement}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {result.hashtags && result.hashtags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Suggested Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.hashtags.map((hashtag, index) => (
                        <span key={index} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm border border-indigo-200">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Posting Time */}
                {result.bestPostingTime && (
                  <div className="bg-amber-100 text-amber-800 p-4 rounded-lg border border-amber-200">
                    <h3 className="font-bold mb-1">Optimal Posting Time</h3>
                    <p>{result.bestPostingTime}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Ready to Go Viral?</h2>
                <p className="text-slate-600 mb-6">Upload your content and discover its viral potential across all major platforms!</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50/70 p-4 rounded-lg border border-blue-100">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="text-slate-800 font-semibold">Multi-Platform Analysis</p>
                    <p className="text-slate-600">Instagram, TikTok, LinkedIn, Twitter</p>
                  </div>
                  <div className="bg-blue-50/70 p-4 rounded-lg border border-blue-100">
                    <div className="text-2xl mb-2">💡</div>
                    <p className="text-slate-800 font-semibold">Smart Suggestions</p>
                    <p className="text-slate-600">AI-powered improvement tips</p>
                  </div>
                  <div className="bg-blue-50/70 p-4 rounded-lg border border-blue-100">
                    <div className="text-2xl mb-2">🔥</div>
                    <p className="text-slate-800 font-semibold">Trend Detection</p>
                    <p className="text-slate-600">Identify viral elements</p>
                  </div>
                  <div className="bg-blue-50/70 p-4 rounded-lg border border-blue-100">
                    <div className="text-2xl mb-2">⏰</div>
                    <p className="text-slate-800 font-semibold">Timing Optimization</p>
                    <p className="text-slate-600">Best posting times</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

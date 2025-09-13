import React, { useState } from 'react';
import { processStrip } from '../services/api';

export default function StripScanner() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await processStrip(file);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to analyze medicine strip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Medicine Strip Scanner</h1>
        <p className="text-gray-600">Upload medicine strip images for quick information</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setFile(e.target.files[0]);
                setError(null);
                setResult(null);
              }}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !file}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold ${
                loading || !file ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Analyzing Strip...' : 'Analyze Strip'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Detected Text</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{result.raw_text}</p>
            </div>
            
            {result.medicines && result.medicines.length > 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Detected Medicine</h3>
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="text-xl font-semibold mb-4">{result.medicines[0].brand_name}</h4>
                  
                  {result.medicines[0].generic && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500">Generic Name:</span>
                      <div className="mt-1">{result.medicines[0].generic}</div>
                    </div>
                  )}

                  {result.medicines[0].ingredients && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500">Ingredients:</span>
                      <div className="mt-1">{result.medicines[0].ingredients}</div>
                    </div>
                  )}

                  {result.medicines[0].uses && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500">Uses:</span>
                      <div className="mt-1">{result.medicines[0].uses}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.medicines[0].dosage_adult && (
                      <div className="p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-500">Adult Dosage:</span>
                        <div className="mt-1 text-sm">{result.medicines[0].dosage_adult}</div>
                      </div>
                    )}
                    
                    {result.medicines[0].dosage_child && (
                      <div className="p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-500">Child Dosage:</span>
                        <div className="mt-1 text-sm">{result.medicines[0].dosage_child}</div>
                      </div>
                    )}
                  </div>

                  {result.medicines[0].side_effects && (
                    <div className="mt-4 p-3 bg-red-50 rounded">
                      <span className="text-sm font-medium text-red-700">Side Effects:</span>
                      <div className="mt-1 text-sm text-red-600">{result.medicines[0].side_effects}</div>
                    </div>
                  )}

                  {result.medicines[0].match_score && (
                    <div className="mt-4 text-sm text-gray-500">
                      Match confidence: {Math.round(result.medicines[0].match_score * 100)}%
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-700">No medicine was confidently detected in the image. Please try uploading a clearer image.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

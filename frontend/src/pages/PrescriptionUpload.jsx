import React, { useState, useCallback } from 'react';
import { processPrescription } from '../services/api';

export default function PrescriptionUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
    setResult(null);
    
    // Create preview
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await processPrescription(file);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to analyze prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Prescription Scanner</h1>
        <p className="text-gray-600">Upload a prescription image to extract medicine information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="prescription-upload"
                />
                <label htmlFor="prescription-upload" className="cursor-pointer">
                  {preview ? (
                    <img 
                      src={preview} 
                      alt="Prescription preview" 
                      className="max-h-64 mx-auto rounded-lg"
                    />
                  ) : (
                    <>
                      <div className="text-6xl mb-4">📄</div>
                      <p className="text-gray-600 mb-2">Click to upload your prescription</p>
                      <p className="text-sm text-gray-500">Or drag and drop an image file</p>
                    </>
                  )}
                </label>
              </div>

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
                {loading ? 'Analyzing Prescription...' : 'Analyze Prescription'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Detected Medicines</h2>
                {result.medicines && result.medicines.length > 0 ? (
                  <div className="space-y-6">
                    {result.medicines.map((medicine, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-700 mb-2">
                          {medicine.brand_name}
                        </h3>
                        
                        {medicine.generic && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-500">Generic Name:</span>
                            <div className="mt-1">{medicine.generic}</div>
                          </div>
                        )}

                        {medicine.prescribed_dosage && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-500">Prescribed Dosage:</span>
                            <div className="mt-1">{medicine.prescribed_dosage}</div>
                          </div>
                        )}

                        {medicine.prescribed_timing && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-500">Timing:</span>
                            <div className="mt-1">{medicine.prescribed_timing}</div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t space-y-3">
                          {medicine.uses && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Uses:</span>
                              <div className="mt-1 text-sm">{medicine.uses}</div>
                            </div>
                          )}
                          
                          {medicine.side_effects && (
                            <div className="p-2 bg-red-50 rounded">
                              <span className="text-sm font-medium text-red-700">Side Effects:</span>
                              <div className="mt-1 text-sm text-red-600">{medicine.side_effects}</div>
                            </div>
                          )}
                        </div>

                        {medicine.match_score && (
                          <div className="mt-4 text-sm text-gray-500">
                            Match confidence: {Math.round(medicine.match_score * 100)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-yellow-700">No medicines were confidently detected in the prescription. Please try uploading a clearer image.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Original Text</h3>
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{result.raw_text}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

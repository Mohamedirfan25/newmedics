import React, { useState, useCallback } from "react";
import { uploadPrescription } from "../services/api";

export default function UploadPrescription() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [uploadError, setUploadError] = useState(null);

  const handleProgress = useCallback((status, percent) => {
    setStatus(status);
    setProgress(percent);
  }, []);

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus('');
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    
    try {
      const data = await uploadPrescription(file, handleProgress);
      setResult(data);
      setStatus('Complete');
    } catch (err) {
      setError(err.message || "An error occurred while uploading the prescription");
      setStatus('Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold text-xl mb-4">Upload Prescription</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <input 
            type="file" 
            accept="image/*,.pdf" 
            onChange={e => {
              const selectedFile = e.target.files[0];
              setFile(selectedFile);
              setError(null);
              setResult(null);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            Accepted formats: JPEG, PNG, GIF, PDF (max 10MB)
          </p>
        </div>
        
        {(loading || status === 'Complete') && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${status === 'Complete' ? 'bg-green-600' : 'bg-blue-600'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        
        <button 
          disabled={loading} 
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {loading ? `${status} (${progress}%)` : "Upload & Analyze Prescription"}
        </button>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            <p className="font-semibold">Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-semibold text-lg mb-2">Analysis Results</h4>
              
              {/* Display Confidence Score */}
              <div className="mb-4">
                <h5 className="font-medium text-gray-700 mb-2">Analysis Confidence:</h5>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${result.confidence >= 70 ? 'bg-green-600' : 'bg-yellow-600'}`}
                      style={{ width: `${result.confidence}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{result.confidence.toFixed(1)}%</span>
                </div>
              </div>

              {/* Display Medicines */}
              {result.medicines && result.medicines.length > 0 && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-700 mb-2">Detected Medicines:</h5>
                  <div className="space-y-3">
                    {result.medicines.map((medicine, idx) => (
                      <div key={idx} className="p-3 bg-white border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{medicine.name}</p>
                            {medicine.dosage && (
                              <p className="text-sm text-gray-600 mt-1">Dosage: {medicine.dosage}</p>
                            )}
                          </div>
                          {medicine.matched && (
                            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        {medicine.layman_summary && (
                          <p className="mt-2 text-sm text-gray-600">{medicine.layman_summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Display original OCR text */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-700 mb-2">Original Text:</h5>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 whitespace-pre-line text-sm">{result.extracted_text || result.ocr_text}</p>
                </div>
              </div>
              
              {/* Display medicines found */}
              {result.medicines && result.medicines.length > 0 && (
                <div>
                  <h5 className="font-medium text-lg text-blue-700 mb-4">Detected Medicines:</h5>
                  {result.medicines.map((med, index) => (
                    <div key={index} className="border-t border-gray-200 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                      <h6 className="font-medium text-blue-600">{med.name}</h6>
                      {med.dosage && (
                        <p className="text-gray-600">
                          <span className="font-medium">Dosage:</span> {med.dosage}
                        </p>
                      )}
                      {med.matched && (
                        <div className="mt-2 bg-green-50 p-3 rounded-md">
                          <p className="text-green-700 font-medium">Matched Medicine: {med.matched}</p>
                          {med.layman_summary && (
                            <p className="text-green-600 mt-1 text-sm">{med.layman_summary}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Display other entities if available */}
              {result.entities && result.entities.length > 0 && (
                <div className="mt-6">
                  <h5 className="font-medium text-gray-700 mb-2">Other Details:</h5>
                  {result.entities
                    .filter(e => !['MEDICINE', 'DOSAGE'].includes(e.label))
                    .map((entity, index) => (
                      <div key={index} className="text-gray-600">
                        <span className="font-medium">{entity.label}:</span> {entity.text}
                      </div>
                    ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {result.confidence && (
                    <>
                      <span>OCR Confidence: {Math.round(result.confidence)}%</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{result.is_handwritten ? 'Handwritten' : 'Printed'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-semibold text-lg mb-2">Analysis Results</h4>
              
              {result.prescriptions && result.prescriptions.map((prescription, index) => (
                <div key={index} className="border-t border-gray-200 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                  <h5 className="font-medium text-lg text-blue-700">{prescription.medicine?.name || 'Unknown Medicine'}</h5>
                  
                  {prescription.dosage && (
                    <p className="text-gray-600">
                      <span className="font-medium">Dosage:</span> {prescription.dosage}
                    </p>
                  )}
                  
                  {prescription.duration && (
                    <p className="text-gray-600">
                      <span className="font-medium">Duration:</span> {prescription.duration}
                    </p>
                  )}
                  
                  {prescription.timing && (
                    <p className="text-gray-600">
                      <span className="font-medium">Timing:</span> {prescription.timing}
                    </p>
                  )}
                  
                  {prescription.medicine?.uses && (
                    <div className="mt-2">
                      <p className="font-medium text-gray-700">Uses:</p>
                      <p className="text-gray-600">{prescription.medicine.uses}</p>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>OCR Confidence: {Math.round(result.confidence)}%</span>
                  <span>•</span>
                  <span>{result.is_handwritten ? 'Handwritten' : 'Printed'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
          </div>
        )}
      </form>

      {res && (
        <div className="mt-3">
          <div className="text-sm"><strong>Patient:</strong> {res.prescription.patient_name || "—"}</div>
          <div className="text-sm"><strong>Doctor:</strong> {res.prescription.doctor_name || "—"}</div>

          <div className="mt-2"><h4 className="font-medium">Entities</h4>
            <div className="mt-1 space-y-1">
              {res.entities && res.entities.length>0 ? res.entities.map((e,i)=>(
                <div key={i} className="text-xs p-1 border rounded">{e.label}: <strong>{e.text}</strong></div>
              )) : <div className="text-xs text-slate-500">No entities</div>}
            </div>
          </div>

          <div className="mt-3">
            <h4 className="font-medium">Detected Medicines</h4>
            {res.medicines && res.medicines.length>0 ? res.medicines.map((m,i)=>(
              <div key={i} className="p-2 border rounded mt-1">
                <div className="text-sm"><strong>{m.name}</strong> — {m.dosage}</div>
                <div className="text-xs text-slate-600">{m.layman_summary || "No summary available"}</div>
              </div>
            )) : <div className="text-xs text-slate-500">None</div>}
          </div>

          <div className="mt-3">
            <h4 className="font-medium">OCR Text</h4>
            <pre className="text-xs bg-slate-100 p-2 rounded scroll-card">{res.extracted_text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

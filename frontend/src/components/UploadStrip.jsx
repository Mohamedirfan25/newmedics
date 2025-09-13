import React, {useState} from "react";
import { uploadStrip } from "../services/api";

export default function UploadStrip(){
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await uploadStrip(file);
      setRes(result);
      setError(null);
    } catch (err) {
      setError(err.message || "An error occurred while processing the image");
      setRes(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Medicine Strip Summarizer</h3>
      <form onSubmit={onSubmit} className="space-y-2">
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/gif" 
          onChange={e => {
            setFile(e.target.files[0]);
            setError(null);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
        />
        <button 
          disabled={loading} 
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 transition-colors"
        >
          {loading ? "Processing..." : "Upload & Scan"}
        </button>
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </form>

      {res && (
        <div className="mt-3">
          {res.found ? (
            <>
              <div className="text-sm"><strong>Detected:</strong> {res.medicine.name}</div>
              <div className="text-xs text-slate-600">{res.medicine.layman_summary}</div>
              <pre className="text-xs bg-slate-100 p-2 rounded mt-2 scroll-card">{res.ocr_text}</pre>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-500">No match found. OCR text shown below:</div>
              <pre className="text-xs bg-slate-100 p-2 rounded mt-2 scroll-card">{res && res.ocr_text}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

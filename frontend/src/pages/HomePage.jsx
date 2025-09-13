import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Your Smart Health Companion</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Link to="/prescription" className="block">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 text-center">
            <div className="text-blue-600 text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Prescription</h2>
            <p className="text-gray-600 mb-4">Upload your prescription for quick analysis</p>
          </div>
        </Link>
        <Link to="/strip-scanner" className="block">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500 text-center">
            <div className="text-green-600 text-6xl mb-4">💊</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Medicine Strip Scanner</h2>
            <p className="text-gray-600 mb-4">Scan medicine strips for quick information</p>
          </div>
        </Link>
      </div>
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Recent Records</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Prescription</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Summary</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {/* Add table rows dynamically */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from "./components/Navbar";
import HomePage from './pages/HomePage';
import PrescriptionUpload from './pages/PrescriptionUpload';
import StripScanner from './pages/StripScanner';

const Footer = () => {
  return (
    <footer className="bg-gray-50 mt-12 py-6">
      <div className="max-w-6xl mx-auto px-6 flex justify-center space-x-6 text-gray-600">
        <a href="#" className="hover:text-gray-900">About</a>
        <a href="#" className="hover:text-gray-900">Contact</a>
        <a href="#" className="hover:text-gray-900">Privacy Policy</a>
      </div>
    </footer>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/prescription" element={<PrescriptionUpload />} />
            <Route path="/strip-scanner" element={<StripScanner />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-extrabold text-white mb-4">
        Unleash Your Data's Power
      </h1>
      <p className="text-xl text-gray-400 mb-8">
        Upload, Analyze, and Visualize your Excel data with interactive 2D and 3D charts.
      </p>
      <div className="space-x-4">
        <Link 
          to="/register" 
          className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
        >
          Get Started
        </Link>
        <Link 
          to="/login" 
          className="text-lg font-semibold text-purple-400 hover:text-purple-300 py-3 px-8 transition duration-300"
        >
          Already have an account? Login
        </Link>
      </div>

      {/* --- IMAGE INTEGRATION STARTS HERE --- */}
      <div className="mt-16 max-w-4xl mx-auto border border-gray-700 rounded-lg p-4 bg-gray-800/50">
        <h2 className="text-3xl font-bold mb-4 text-purple-400">Example Visualization</h2>
        
        {/* The <img> tag using the public path */}
        <div className="rounded-lg overflow-hidden shadow-2xl">
            <img 
                src="/dashboard_preview.png" // Use the root path: / + filename
                alt="A preview of the Excel Analytics Dashboard with a bar chart"
                className="w-full h-auto object-cover"
            />
        </div>
        <p className="text-gray-400 text-sm mt-4">
            Transform your spreadsheets into insightful, downloadable charts and AI summaries.
        </p>
      </div>
      {/* --- IMAGE INTEGRATION ENDS HERE --- */}

    </div>
  );
};

export default LandingPage;
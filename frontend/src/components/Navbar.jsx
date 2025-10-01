// src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  // Get userInfo and ensure it's parsed
  const userInfo = localStorage.getItem('userInfo') 
    ? JSON.parse(localStorage.getItem('userInfo')) 
    : null;
    
  // Destructure properties safely
  const { username, isAdmin } = userInfo || {};

  const logoutHandler = () => {
    localStorage.removeItem('userInfo'); // Remove token and user info
    navigate('/'); // Redirect to landing page
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-purple-400">
          📊 ExcelAnalytics
        </Link>
        <div className="space-x-4 flex items-center"> {/* ADDED: flex items-center for alignment */}
          {userInfo ? (
            // If logged in, show Dashboard and Logout
            <>
              <span className='text-sm text-gray-400 hidden sm:inline'>
                Welcome, {username}!
              </span>
              {isAdmin && (
                <span className="text-xs bg-red-800 text-white px-2 py-1 rounded-full">
                  Admin
                </span>
              )}
              <Link 
                to="/dashboard" 
                className="text-white hover:text-purple-300 transition duration-300"
              >
                Dashboard
              </Link>
              <button 
                onClick={logoutHandler} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            // If logged out, show Login and Sign Up
            <>
              <Link 
                to="/login" 
                className="text-white hover:text-purple-300 transition duration-300"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (message) {
        const timer = setTimeout(() => {
            setMessage(null);
        }, 5000); // 5 seconds

        return () => clearTimeout(timer);
    }
  }, [message]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const { data } = await axios.post(
        'http://localhost:5000/api/users/login', // Target the backend endpoint
        { email, password },
        config
      );

      // On successful login:
      localStorage.setItem('userInfo', JSON.stringify(data));
      navigate('/dashboard');

    } catch (error) {
      setMessage(error.response && error.response.data.message
        ? error.response.data.message
        : error.message);
    }
  };

  return (
    <div className="flex justify-center items-center py-10">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-purple-400 mb-6">Login</h1>

        {message && (
          <div className="bg-red-900 text-white p-3 rounded mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded transition duration-300"
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-center text-gray-400">
          New User?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
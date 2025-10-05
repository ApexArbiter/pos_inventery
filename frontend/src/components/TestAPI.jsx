import React, { useState, useEffect } from 'react';
import axios from '../api/axiosInstance';

const TestAPI = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing API call...');
      const response = await axios.get('/products');
      console.log('API Response:', response.data);
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Test</h1>
      
      <button 
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Products ({products.length})</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(products, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default TestAPI;

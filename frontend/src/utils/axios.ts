import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://localhost:3000',
  withCredentials: true,
  // Add timeout to prevent infinite pending requests
  timeout: 10000,
});

// Add a request interceptor to add the token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    const token = localStorage.getItem('token');
    if (token) {
      // Make sure headers object is initialized
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}: status ${response.status}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error(`Error ${error.response.status} for ${error.config.url}:`, error.response.data);
      
      if (error.response.status === 401) {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (error.response.status === 500) {
        // Log more details about server errors
        console.error('Server error details:', error.response.data);
        console.error('Request that caused the error:', {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
        });
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something else happened while setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 
import axios from "axios";

const axiosInstance = axios.create({
  // baseURL: "https://cathering-app-eight.vercel.app/api",
  baseURL: "http://localhost:5001/api",
  // baseURL: "https://cathering-app.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // if you're using cookies or sessions
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log("Authentication failed - clearing tokens");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Optional: redirect to login
      window.location.href = "/login";
    }

    if (error.response?.status === 403) {
      console.log("Access forbidden - user not authorized");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

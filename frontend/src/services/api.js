import axios from "axios";

// Set default base URL for API requests
const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// Create axios instance with default config
const API = axios.create({ 
  baseURL: BASE,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'multipart/form-data',
  },
  withCredentials: true, // Important for CORS with credentials
  timeout: 60000, // Increase timeout to 60 seconds for image processing
});

// Add request interceptor to add auth token if available
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const processStrip = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await API.post('/api/process-strip/', formData);
  return response.data;
};

export const processPrescription = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await API.post('/api/process-prescription/', formData);
  return response.data;
};

// Add response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.error || 'An error occurred with the server');
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server. Please check if the backend is running.');
    } else {
      // Error in request setup
      throw new Error('Error setting up the request');
    }
  }
);

export const uploadPrescription = async (file, onProgress) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF) or PDF file.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    const fd = new FormData();
    fd.append("file", file);

    const response = await API.post("/api/upload-prescription/", fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress('Uploading', percentCompleted);
        }
      }
    });

    if (onProgress) {
      onProgress('Processing', 100);
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const uploadStrip = async (file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    const fd = new FormData();
    fd.append("file", file);

    const response = await API.post("/api/upload-strip/", fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addReminder = async (payload) => {
  try {
    const response = await API.post("/api/add-reminder/", payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getDashboard = async () => {
  try {
    const response = await API.get("/api/dashboard/");
    return response.data;
  } catch (error) {
    throw error;
  }
};

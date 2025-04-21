// src/api/axiosConfig.ts
import axios from 'axios';
import Cookies from 'js-cookie'; // Keep js-cookie if using manual XSRF header

// Function to get cookie value
function getCookieValue(name: string): string | undefined {
    return Cookies.get(name);
}

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true, // Keep this true
  // --- REMOVE Content-Type from default headers ---
  // Axios will set it correctly based on data (JSON or FormData)
  // headers: {
  //   'Content-Type': 'application/json', // <-- REMOVE or COMMENT OUT
  // }
});

// --- MODIFIED Request Interceptor ---
apiClient.interceptors.request.use(config => {
  // 1. Set X-XSRF-TOKEN Header (Always needed for stateful requests)
  const xsrfToken = getCookieValue('XSRF-TOKEN');
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
    // console.log("Interceptor: Set X-XSRF-TOKEN header to:", config.headers['X-XSRF-TOKEN']);
  } else {
    console.warn("Interceptor: Could not find XSRF-TOKEN cookie for request.");
  }

  // 2. Set Authorization Header if token exists
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  // --- Conditional Content-Type ---
  // 3. Set Content-Type to application/json ONLY if data is NOT FormData
  // Axios usually handles FormData content-type automatically if not overridden
  if (!(config.data instanceof FormData)) {
     // Ensure Accept header is still set for non-FormData requests
     if (!config.headers['Accept']) {
          config.headers['Accept'] = 'application/json';
     }
     // Ensure Content-Type is json if not FormData (and not already set differently)
     if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
     }
     // console.log("Interceptor: Setting JSON headers for non-FormData request");
  } else {
      // For FormData, explicitly remove Content-Type if it was somehow set previously,
      // to let the browser set it correctly with the boundary.
      // delete config.headers['Content-Type']; // Usually not needed, Axios handles it
      // console.log("Interceptor: Letting browser set Content-Type for FormData request");
  }
  // -----------------------------

  return config;
}, error => {
  return Promise.reject(error);
});
// --- END MODIFIED Request Interceptor ---


// --- Response Interceptor (Keep as before) ---
apiClient.interceptors.response.use(response => response, error => {
  // ... error handling (e.g., 401 redirect) ...
  return Promise.reject(error);
});
// --------------------------------------------

export default apiClient;
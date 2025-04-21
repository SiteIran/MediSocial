// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress
} from '@mui/material';
import apiClient from '../api/axiosConfig'; // Your configured Axios instance for /api routes
import axios from 'axios'; // Import base Axios for non-/api requests
import { useAuth } from '../context/AuthContext';

// --- Define your base backend URL (without /api) ---
// Best practice: Use environment variables (e.g., import.meta.env.VITE_APP_URL for Vite)
// Example: const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const APP_URL = 'http://localhost:8000'; // Replace if using env vars
// ----------------------------------------------------

const LoginPage: React.FC = () => {
  // State for form inputs
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // State for component/request loading and status
  const [loading, setLoading] = useState(false); // For individual button loading
  const [error, setError] = useState<string | null>(null);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [isCsrfReady, setIsCsrfReady] = useState(false); // Track CSRF cookie readiness

  // Get auth state and functions from context
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // --- Effects ---

  // 1. Fetch CSRF cookie on component mount
  useEffect(() => {
    // Only fetch if not already authenticated and CSRF not ready
    if (!isAuthenticated && !isCsrfReady) {
      console.log("Attempting to fetch CSRF cookie...");
      // --- Use base axios with full URL for CSRF ---
      axios.get(`${APP_URL}/sanctum/csrf-cookie`, {
        withCredentials: true // IMPORTANT: Keep this to allow setting cookies
      })
        .then(() => {
          console.log("CSRF cookie fetched successfully.");
          setIsCsrfReady(true); // Mark CSRF as ready
        })
        .catch(err => {
          console.error('Failed to fetch CSRF cookie:', err);
          // Provide a more specific error message if possible
          let errMsg = `Session initialization failed. Please check backend connection and refresh.`;
          if (axios.isAxiosError(err) && err.response) {
              errMsg = `Session initialization failed (${err.response.status} ${err.response.statusText}). Please check backend connection and refresh.`;
          } else if (err instanceof Error) {
              errMsg = `Session initialization failed (${err.message}). Please check backend connection and refresh.`;
          }
          setError(errMsg);
          setIsCsrfReady(false); // Keep CSRF as not ready
        });
      // --- End CSRF request change ---
    } else if (isAuthenticated) {
        // If already authenticated, CSRF is implicitly handled or not needed for navigation
        console.log("User already authenticated, setting CSRF as ready.");
        setIsCsrfReady(true);
    }
  }, [isAuthenticated, isCsrfReady]); // Re-run if auth status or CSRF readiness changes (though CSRF fetch should only run once effectively)

  // 2. Redirect if already authenticated (after initial auth check)
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      console.log("User authenticated, redirecting to /home...");
      navigate('/home');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // --- Handlers ---

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCsrfReady) {
      setError("Session not ready. Please wait or refresh.");
      return;
    }
    // Basic phone number validation (optional, backend validation is key)
    if (!/^(0)?9\d{9}$/.test(phoneNumber)) {
        setError("Please enter a valid Iranian mobile number (e.g., 0912...).");
        return;
    }

    setLoading(true);
    setError(null);
    setOtpSentMessage(null);
    try {
      console.log("Requesting OTP for:", phoneNumber);
      // Use apiClient here as it correctly points to /api/auth/otp/request
      const response = await apiClient.post('/auth/otp/request', { phone_number: phoneNumber });
      console.log("OTP request successful:", response.data);
      setOtpSentMessage(response.data.message || 'OTP sent successfully.'); // Use message from response
        // --- !!! TEMPORARY - FOR TESTING WITHOUT SMS ONLY !!! ---
        // Uncomment below line locally if backend returns OTP for testing
        // if (response.data.otp_for_testing) {
        //     setOtpSentMessage(prev => prev ? `${prev} (Test: ${response.data.otp_for_testing})` : `Test OTP: ${response.data.otp_for_testing}`);
        // }
        // --- !!! END TEMPORARY !!! ---
      setShowOtpInput(true); // Show OTP input field
    } catch (err: any) {
      console.error("OTP Request Error:", err);
      if (axios.isAxiosError(err) && err.response) {
          if (err.response.status === 419) {
            setError('Your session has expired. Please refresh the page and try again.');
            setIsCsrfReady(false); // Force re-fetch of CSRF on next attempt maybe? Or just force refresh.
          } else if (err.response.data && err.response.data.errors) {
            const errors = Object.values(err.response.data.errors).flat().join(', ');
            setError(`Request failed: ${errors}`);
          } else if (err.response.data && err.response.data.message) {
            setError(`Request failed: ${err.response.data.message}`);
          } else {
             setError(`OTP request failed with status ${err.response.status}.`);
          }
      } else {
        setError('An unexpected network error occurred while requesting OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCsrfReady) {
        setError("Session not ready. Please wait or refresh.");
        return;
    }
    // Basic OTP validation
    if (!/^\d{6}$/.test(otp)) { // Assuming 6 digits
        setError("Please enter a valid 6-digit OTP code.");
        return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("Attempting login with OTP:", otp);
      // Use apiClient here as it correctly points to /api/auth/otp/login
      const response = await apiClient.post('/auth/otp/login', {
        phone_number: phoneNumber,
        otp: otp,
      });
      console.log("Login successful:", response.data);
      const { access_token, user } = response.data;
      login(access_token, user); // Update auth context
      // Navigation is handled by the useEffect watching isAuthenticated
    } catch (err: any) {
      console.error("Login Error:", err);
      if (axios.isAxiosError(err) && err.response) {
          if (err.response.status === 419) {
            setError('Your session has expired. Please refresh the page and try again.');
            setIsCsrfReady(false);
          } else if (err.response.data && err.response.data.message) {
            setError(`Login failed: ${err.response.data.message}`);
          } else if (err.response.data && err.response.data.errors) {
            const errors = Object.values(err.response.data.errors).flat().join(', ');
            setError(`Login failed: ${errors}`);
          } else {
            setError(`Login failed with status ${err.response.status}.`);
          }
       } else {
         setError('An unexpected network error occurred during login.');
       }
    } finally {
      setLoading(false);
    }
  };

  // --- Conditional Rendering ---

  // Show loading indicator while checking auth or waiting for CSRF
  if (isAuthLoading || (!isCsrfReady && !error)) {
    // Don't show error here if CSRF failed, it's shown in the main form area below
    return (
        <Container component="main" maxWidth="xs" sx={{ textAlign: 'center', mt: 8 }}>
           <Typography>{isAuthLoading ? 'Checking authentication...' : 'Initializing session...'}</Typography>
           <LinearProgress sx={{ mt: 2 }} />
           {/* Show CSRF error here if it occurred during init */}
           {error && !isCsrfReady && <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 1 }}>{error}</Alert>}
        </Container>
    );
  }

  // If authenticated, useEffect will redirect, render nothing here to avoid flicker
  if (isAuthenticated) {
    console.log("Already authenticated, rendering null."); // Debug log
    return null;
  }

  // --- Render Login Form ---
  console.log("Rendering login form. CSRF Ready:", isCsrfReady); // Debug log
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          {showOtpInput ? 'Enter OTP Code' : 'Login / Register'}
        </Typography>

        {/* Display general errors or OTP success message */}
        {error && <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 1 }}>{error}</Alert>}
        {otpSentMessage && !error && <Alert severity="success" sx={{ width: '100%', mt: 2, mb: 1 }}>{otpSentMessage}</Alert>}

        {!showOtpInput ? (
          // Phone Number Input Form
          <Box component="form" onSubmit={handleRequestOtp} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone_number"
              label="Mobile Number (e.g., 0912...)"
              name="phone_number"
              type="tel" // Use tel type for better mobile input
              autoComplete="tel"
              autoFocus
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading || !isCsrfReady} // Disable if loading or CSRF not ready
              inputProps={{
                 inputMode: "numeric", // Suggest numeric keyboard on mobile
                 pattern: "^(0)?9\\d{9}$" // Basic pattern validation hint
              }}
              helperText={!isCsrfReady ? "Initializing..." : ""}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !isCsrfReady || !phoneNumber} // Disable if loading, CSRF not ready, or no phone number
            >
              {loading ? <CircularProgress size={24} /> : 'Send OTP Code'}
            </Button>
          </Box>
        ) : (
          // OTP Input Form
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="otp"
              label="OTP Code"
              type="number" // Often better for mobile OTP input
              id="otp"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading} // Only disable based on login request loading
              InputProps={{
                inputMode: 'numeric', // Ensure numeric keyboard
              }}
               // You might want to limit length visually or via pattern
               // inputProps={{ maxLength: 6 }} // HTML maxLength doesn't work reliably for type="number"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !otp || otp.length !== 6} // Disable if loading, no OTP, or OTP length is not 6
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
            <Button
              fullWidth
              variant="text"
              sx={{ mb: 2 }}
              onClick={() => {
                setShowOtpInput(false); // Go back to phone input
                setError(null);        // Clear errors
                setOtp('');            // Clear OTP field
                setOtpSentMessage(null); // Clear success message
                // Keep phone number
              }}
              disabled={loading} // Disable if login request is loading
            >
              Change Number
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default LoginPage;
// src/main.tsx (or index.tsx)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Your main App component
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
// import { ThemeProvider } from '@mui/material/styles'; // Removed
// import theme from './theme'; // Removed
import './index.css'; // Your global styles
import { Container } from '@mui/material';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <ThemeProvider theme={theme}>  Removed */}
    <Container maxWidth="lg"> {/* <--- THIS WOULD CAUSE THE ISSUE */}
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    </Container>
    {/* </ThemeProvider> Removed */}
  </React.StrictMode>,
);
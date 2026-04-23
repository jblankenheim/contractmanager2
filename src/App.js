import './App.css';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import logo from './assets/CFE_Logo.png';
import HomePage from './HomePage';


const myTheme = {
  name: 'custom-theme',
  tokens: {
    colors: {
      background: { primary: { 100: '#000000' } },
      brand: { primary: { 10: '#e8820e', 80: '#ff9900' } },
      font: { interactive: { primary: '#ffffff' } },
    },
  },
};

export default function App() {
  return (
    <ThemeProvider theme={myTheme}>
      <div className="auth-container">
        <Authenticator
          hideSignUp={true}
          components={{
            Header() {
              return (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img src={logo} alt="Company Logo" style={{ width: 200 }} />
                </div>
              );
            },
          }}
        >
          {({ signOut, user }) => (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage user={user} signOut={signOut} />} />
                
              </Routes>
            </BrowserRouter>
          )}
        </Authenticator>
      </div>
    </ThemeProvider>
  );
}
// src/App.js
import './App.css';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import logo from './assets/CFE_Logo.png';
import HomePage from './HomePage';

// Custom theme for colors
const myTheme = {
  name: 'custom-theme',
  tokens: {
    colors: {
      background: {
        primary: { 100: '#000000' }, // black background
      },
      brand: {
        primary: { 10: '#e8820e', 80: '#ff9900' }, // brand color
      },
      font: {
        interactive: { primary: '#ffffff' }, // text color
      },
    },
  },
};

export default function App() {
  return (
    <ThemeProvider theme={myTheme}>
      <div className="auth-container">
        <Authenticator
          hideSignUp={true}      // hides the sign up button
          components={{
            Header() {          // puts logo at the top of login page
              return (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img
                    src={logo}
                    alt="Company Logo"
                    style={{ width: 200 }}
                  />
                </div>
              );
            },
          }}
        >
          {({ signOut, user }) => (
            <HomePage style={{ textAlign: 'center', color: 'white' }}>
              <h1>Welcome, {user.username}</h1>
              <button onClick={signOut}>Sign Out</button>
            </HomePage>
          )}
        </Authenticator>
      </div>
    </ThemeProvider>
  );
}
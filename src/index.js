import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
import { AuthProvider } from "react-oidc-context";
Amplify.configure(awsExports);
console.log(Amplify.getConfig());
const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_j8uQZxYbi",
  client_id: "7nc5a6nqnbrp4lqt6b39t6qtrk",
  redirect_uri: "<redirect uri>",
  response_type: "code",
  scope: "<scopes>",
};

const root = ReactDOM.createRoot(document.getElementById("root"));

// wrap the application with AuthProvider
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
import React from 'react'
import logo from "./assets/CFE_Logo.png";

function ReviewPage() {
  return (<div style={{
    minHeight: "100vh",
    background: "black",
    display: "flex",
    flexDirection: "column",
    justifyContent: 'center',
    top: 0,
    paddingTop: 30,
  }}>
    <img src={logo} alt="Logo" style={{ width: 120 }} />
  </div>
  )
}

export default ReviewPage
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import ApproverPage from "./components/ApproverPage";


function App() {
  return (
    <Router>
      <nav style={{ padding: "10px", backgroundColor: "#222" }}>
        <ul style={{ display: "flex", listStyle: "none", gap: "15px", color: "#fff" }}>
          
          <li><Link to="/approver" style={{ color: "white" }}>About</Link></li>
          
        </ul>
      </nav>

      <Routes>

        <Route path="/approver" element={<ApproverPage />} />

      </Routes>
    </Router>
  );
}

export default App;

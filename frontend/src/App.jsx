import {BrowserRouter, Routes ,Route  } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Navbar from "./components/Navbar";
import ReportDetails from "./pages/ReportDetails";
import AIPrediction from "./pages/AIPrediction";

function App(){
  return (
    <BrowserRouter>
      <Navbar />
  
    <Routes>
      <Route path="/"element={<Dashboard/>} />
      <Route path="/reports" element={<Reports/>} />
      <Route path="/reports/:id" element={<ReportDetails/>} />
      <Route path="/analyze" element={<AIPrediction/>} />
    </Routes>
      </BrowserRouter>
  );
}

export default App;

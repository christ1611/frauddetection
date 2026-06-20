import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import EmergencyFAB from './components/EmergencyFAB';
import ReportPage from './pages/ReportPage';
import AdminPage from './pages/AdminPage';
import TrackPage from './pages/TrackPage';

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<ReportPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/track" element={<TrackPage />} />
      </Routes>
      <EmergencyFAB />
    </BrowserRouter>
  );
}

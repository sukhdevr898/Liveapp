import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Splash from "./components/Splash";
import { useState, useEffect } from "react";

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for splash screen
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return <Splash />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:id" element={<Room />} />
    </Routes>
  );
}

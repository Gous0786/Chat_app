import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./Components/HomePage";
import Signin from "./Components/Register/Signin";
import Signup from "./Components/Register/Signup";

function App() {
  return (
   
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<Signin/>} />
        <Route path="/signup" element={<Signup/>} />
      </Routes>
   
  );
}

export default App;
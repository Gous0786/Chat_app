import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import HomePage from "./Components/HomePage";
import Signin from "./Components/Register/Signin";
import Signup from "./Components/Register/Signup";

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

function Page({ children }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><HomePage /></Page>} />
        <Route path="/signin" element={<Page><Signin /></Page>} />
        <Route path="/signup" element={<Page><Signup /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;

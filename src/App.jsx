import { useEffect } from 'react';
import './App.css'
// import SpearStickmanGame from './components/SpearStickmanGame'
// import Stickyman from './components/Stickyman'
import StickymanLevel from './components/StickymanLevel'

function App() {

  useEffect(() => {
    if (typeof document !== "undefined") {
      const noSelectElements = document.querySelectorAll(".no-select");
      noSelectElements.forEach((el) => {
        el.style.userSelect = "none";
      });
    }
  }, []);

  return (
    <>
      {/* <SpearStickmanGame /> */}
      {/* <Stickyman /> */}
      <StickymanLevel className="no-select" />
    </>
  )
}

export default App

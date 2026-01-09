//frontend/src/custom-components/Spinner.jsx
import React from "react";
import { HashLoader } from "react-spinners";

const Spinner = () => {
  return (
    <div 
      className="fixed inset-0 flex justify-center items-center bg-transparent z-50"
      style={{ backdropFilter: "none" }} // ensure no blur or background color
    >
      <HashLoader size={130} color="#2B8ED6" />
    </div>
  );
};

export default Spinner;

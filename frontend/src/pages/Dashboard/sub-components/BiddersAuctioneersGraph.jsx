// frontend/src/pages/Dashboard/sub-components/BiddersAuctioneersGraph.jsx
 
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useSelector } from "react-redux";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const BiddersAuctioneersGraph = () => {
  const { totalAuctioneers = [], totalBidders = [] } = useSelector(
    (state) => state.superAdmin
  );

  const labels = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const maxY = Math.max(...totalAuctioneers.concat(totalBidders, [50]));

  const data = {
    labels,
    datasets: [
      {
        label: "Bidders",
        data: totalBidders,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#1d4ed8",
      },
      {
        label: "Auctioneers",
        data: totalAuctioneers,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#059669",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: maxY,
        ticks: {
          callback: (value) => value.toLocaleString(),
          color: "#334155",
          font: { size: 12 },
        },
        grid: { color: "#e2e8f0" },
      },
      x: {
        ticks: {
          color: "#64748b",
          font: { size: 11 },
        },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#475569",
          font: { size: 12, weight: "600" },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#0f172a",
        titleFont: { weight: "bold", size: 12 },
        bodyFont: { size: 12 },
      },
    },
  };

  return (
    <div className="h-full w-full max-w-full">
      <Line data={data} options={options} />
    </div>
  );
};

export default BiddersAuctioneersGraph;

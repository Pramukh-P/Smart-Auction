// frontend/src/pages/Dashboard/sub-components/PaymentGraph.jsx

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useSelector } from "react-redux";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_LABELS = [
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

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const PaymentGraph = () => {
  // monthlyRevenue = monthly commission from Commission collection
  const { monthlyRevenue } = useSelector((state) => state.superAdmin);

  const revenueArray = useMemo(() => {
    if (!monthlyRevenue) return new Array(12).fill(0);

    if (Array.isArray(monthlyRevenue)) {
      const arr = monthlyRevenue.slice(0, 12).map(toNumber);
      if (arr.length < 12) arr.push(...new Array(12 - arr.length).fill(0));
      return arr;
    }

    if (typeof monthlyRevenue === "object") {
      const byIndex = MONTH_LABELS.map((_, idx) => {
        const key1 = String(idx + 1);
        const key2 = MONTH_LABELS[idx];
        return toNumber(
          monthlyRevenue[key1] ??
            monthlyRevenue[key2] ??
            monthlyRevenue[idx] ??
            0
        );
      });
      return byIndex;
    }

    return new Array(12).fill(0);
  }, [monthlyRevenue]);

  const maxY = Math.max(500, ...revenueArray);

  const data = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: "Commission received (₹)",
        data: revenueArray,
        backgroundColor: "rgba(37,99,235,0.85)",
        borderColor: "#1d4ed8",
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.6,
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
          color: "#64748b",
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
        callbacks: {
          label: (context) =>
            `₹ ${context.parsed.y.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="h-full w-full max-w-full">
      <Bar data={data} options={options} />
    </div>
  );
};

export default PaymentGraph;

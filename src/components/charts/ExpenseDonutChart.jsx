import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ExpenseDonutChart({ dataMap = {} }) {
  const labels = Object.keys(dataMap);
  const dataValues = Object.values(dataMap);

  const colors = [
    '#2563EB', '#059669', '#D97706', '#DC2626', 
    '#7C3AED', '#0EA5E9', '#EC4899', '#64748B'
  ];

  const chartData = {
    labels: labels.length > 0 ? labels : ['No Expense Data'],
    datasets: [
      {
        data: dataValues.length > 0 ? dataValues : [1],
        backgroundColor: dataValues.length > 0 ? colors.slice(0, labels.length) : ['#E2E8F0'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { size: 12, family: 'Inter' } }
      }
    }
  };

  return (
    <div style={{ height: '240px', width: '100%', position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

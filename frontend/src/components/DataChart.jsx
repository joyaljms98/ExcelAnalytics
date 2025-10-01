// src/components/DataChart.jsx
import React, { forwardRef } from 'react';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement,
} from 'chart.js';

// Register ALL the components needed
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement
);

const DataChart = forwardRef(({ chartData, chartType, xLabel, yLabel, chartTitle }, ref) => {

    // Helper to configure scales. Scales are typically disabled for Pie charts.
    const getChartScales = (type) => {
        if (type === 'pie') {
            return {}; // Empty scales object disables them for Pie/Doughnut charts
        }
        
        // Standard scales configuration for Bar, Line, Scatter
        return {
            x: {
                title: {
                    display: true,
                    text: xLabel,
                    color: '#a78bfa',
                },
                ticks: {
                    color: '#ccc',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                }
            },
            y: {
                title: {
                    display: true,
                    text: yLabel,
                    color: '#a78bfa',
                },
                ticks: {
                    color: '#ccc',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                }
            }
        };
    };

    // 1. Basic Chart Configuration (Options)
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: chartType === 'pie' ? 'right' : 'top', // Move legend for Pie chart
                labels: {
                    color: '#fff',
                }
            },
            title: {
                display: true,
                text: chartTitle || 'Data Visualization',
                color: '#fff',
                font: { size: 18 }
            },
            tooltip: {
                bodyColor: '#333',
                titleColor: '#333',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }
        },
        scales: getChartScales(chartType), // Use dynamic scales helper
    };
    

    // 2. Select the Chart Component (FIXED: using 'let' once)
    let ChartComponent;
    switch (chartType) {
        case 'line':
            ChartComponent = Line;
            break;
        case 'pie':
            ChartComponent = Pie;
            break;
        case 'scatter':
            ChartComponent = Scatter;
            break;
        case 'bar':
        default:
            ChartComponent = Bar;
            break;
    }

    return (
        <div className="p-4 bg-gray-800 rounded-lg shadow-2xl h-[500px]">
            {/* THIS LINE IS CORRECT, ENSURE IT IS PRESENT AND UNCHANGED: */}
            <ChartComponent ref={ref} data={chartData} options={options} /> 
        </div>
    );
});

export default DataChart;
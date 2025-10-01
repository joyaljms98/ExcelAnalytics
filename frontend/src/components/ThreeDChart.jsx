// src/components/ThreeDChart.jsx
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Text, Line as DreiLine, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Define the maximum dimensions for the scene
const MAX_HEIGHT = 5;
const BAR_SPACING = 2;
const Z_DEPTH = 0.5;
const BASE_RADIUS = 2.5;

// --- Reusable 3D Components ---

// Universal Label for Axes and Titles
const ChartText = ({ position, children, size = 0.4, color = "#a78bfa", rotation = [0, 0, 0], anchorX = "center", anchorY = "middle", ...props }) => (
    <Text 
        position={position} 
        fontSize={size} 
        color={color} 
        anchorX={anchorX} 
        anchorY={anchorY}
        rotation={rotation}

        {...props}
    >
        {children}
    </Text>
);

// Bar Element for 3D Column Chart (Updated for Label Placement)
const BarElement = ({ position, height, color, label }) => (
    <group>
        <Box args={[0.8, height, Z_DEPTH]} position={position} >
            <meshStandardMaterial attach="material" color={color} />
        </Box>
        {/* Legend/Label placed in horizontal plane corresponding to its column */}
        <ChartText 
            position={[position[0], -0.2, position[2] + Z_DEPTH + 0.5]} 
            fontSize={0.25} 
            color="#ccc" 
            rotation={[-Math.PI / 2, 0, 0]} 
        >
            {label}
        </ChartText>
    </group>
);

// Point Element for 3D Scatter Plot and Line Plot
const ScatterElement = ({ position, color, label, value }) => (
    <group>
        <Sphere args={[0.1, 16, 16]} position={position}>
            <meshStandardMaterial attach="material" color={color} />
        </Sphere>
        {/* Scale (Value) next to the point */}
        <ChartText 
            position={[position[0] + 0.3, position[1], position[2]]} 
            size={0.15} 
            color="#fff" 
            anchorX="left"
        >
            {value.toFixed(2)}
        </ChartText>
        {/* Category (Label) below the point on the axis */}
        <ChartText 
            position={[position[0], -0.2, position[2]]} 
            fontSize={0.25} 
            color="#ccc" 
            rotation={[-Math.PI / 2, 0, 0]}
        >
            {label}
        </ChartText>
    </group>
);

// --- 3D Pie Slice Component (Updated for Outward Labels) ---
const PieSlice = ({ position, color, startAngle, endAngle, radius, height, label, percentage }) => { 
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); 
        shape.arc(0, 0, radius, startAngle, endAngle, false);
        shape.lineTo(0, 0);

        return new THREE.ExtrudeGeometry(shape, {
            steps: 1,
            depth: height, 
            bevelEnabled: false,
        });
    }, [startAngle, endAngle, radius, height]); 
    
    const midAngle = startAngle + (endAngle - startAngle) / 2; 
    const radialOffset = radius + 1.2;   // <-- increased spacing
    const labelYOffset = height + 0.05;

    return (
        <group position={position}>
            {/* Pie slice in X–Y plane */}
            <mesh geometry={geometry}>
                <meshStandardMaterial attach="material" color={color} />
            </mesh>

            {/* Legend pushed further outward */}
            <ChartText 
                position={[
                    Math.cos(midAngle) * radialOffset, 
                    Math.sin(midAngle) * radialOffset,
                    labelYOffset
                ]}
                rotation={[0, 0, midAngle]} 
                size={0.25}
                color={color}
                anchorX="center"
            >
                {`${label} (${percentage.toFixed(1)}%)`}
            </ChartText>
        </group>
    );
};

// --- Main ThreeDChart Component ---

const ThreeDChart = ({ data, xLabel, yLabel, zLabel, chartType }) => { 
    
    const toNumeric = (value) => {
        const num = parseFloat(String(value).replace(/,/g, '')) || 0;
        return isFinite(num) ? num : 0;
    };
    
    const colors = useMemo(() => [
        '#a78bfa', '#f05a82', '#64c8ff', '#ffc85a', '#96faff', '#ff6384', '#36a2eb'
    ], []);

    const processedData = useMemo(() => {
        let maxDataValue = 1;
        
        const chartData = data.map(row => {
            const xValue = String(row[xLabel]);
            const yValue = toNumeric(row[yLabel]);
            const zValue = zLabel ? toNumeric(row[zLabel]) : 0;

            maxDataValue = Math.max(maxDataValue, yValue, zValue);
            return { label: xValue, y: yValue, z: zValue };
        });

        const totalY = chartData.reduce((sum, d) => sum + d.y, 0);

        return { chartData, maxDataValue, totalY };
    }, [data, xLabel, yLabel, zLabel]);

    const { chartData, maxDataValue, totalY } = processedData;

    const numPoints = chartData.length;
    
    // Dynamic Scene setup
    let centerOffset = 0;
    let sceneWidth = 0;
    let cameraPosition = [0, MAX_HEIGHT * 1.5, numPoints * BAR_SPACING]; 
    let targetPosition = [0, MAX_HEIGHT / 2, 0];
    let maxZValue = 1;

    if (chartType === 'bar3d' || chartType === 'scatter3d' || chartType === 'line3d') {
        sceneWidth = numPoints * BAR_SPACING;
        centerOffset = sceneWidth / 2 - BAR_SPACING / 2;
        // Fix for diagonal/vertical plane issue: Center the Z position
        const Z_CENTER = 0; 
        cameraPosition = [centerOffset, MAX_HEIGHT * 1.5, sceneWidth + 5]; 
        targetPosition = [centerOffset, MAX_HEIGHT / 2, Z_CENTER];
        maxZValue = Math.max(...chartData.map(d => d.z)) || 1;
    } else if (chartType === 'pie3d') {
        sceneWidth = BASE_RADIUS * 3;
        centerOffset = BASE_RADIUS; // Center the pie at X=0
        
        // FIX: Camera position adjusted for the vertical plane
        cameraPosition = [0, MAX_HEIGHT * 2, BASE_RADIUS * 2]; 
        
        // FIX: Target should be the center of the pie (0, 0, 0)
        targetPosition = [BASE_RADIUS, 0, 0];
    }

    // --- Dynamic Visualization Rendering ---
    const renderVisualization = () => {
        const visualizations = [];
        let currentAngle = 0;
        const linePoints = []; 
        const Z_OFFSET = (chartType === 'bar3d') ? 0 : 0; // Ensures bars are centered on Z=0

        chartData.forEach((d, i) => {
            const color = colors[i % colors.length];

            if (chartType === 'bar3d') {
                const scaledHeight = (d.y / maxDataValue) * MAX_HEIGHT;
                const xPos = i * BAR_SPACING;
                
                visualizations.push(
                    <BarElement 
                        key={i}
                        position={[xPos, scaledHeight / 2, Z_OFFSET]}
                        height={scaledHeight}
                        color={color}
                        label={d.label}
                    />
                );
            } else if (chartType === 'pie3d') {
                const angle = (d.y / totalY) * 2 * Math.PI;
                
                visualizations.push(
                    <PieSlice 
                        key={i}
                        index={i} // <--- NEW: Pass the index for staggering
                        position={[0, 0, 0]}
                        color={color}
                        startAngle={currentAngle}
                        endAngle={currentAngle + angle}
                        radius={BASE_RADIUS}
                        height={Z_DEPTH}
                        label={d.label}
                        percentage={(d.y / totalY) * 100}
                    />
                );
                currentAngle += angle;
            } else if (chartType === 'scatter3d' || chartType === 'line3d') {
                // Cartesian Plots (Line/Scatter)
                const scaledY = (d.y / maxDataValue) * MAX_HEIGHT;
                const scaledZ = (d.z / maxZValue) * MAX_HEIGHT;
                const xPos = i * BAR_SPACING; 
                
                // For Line/Scatter: Ensure Z is mostly zero to keep it on the vertical (X-Y) plane, 
                // unless Z-axis data is actually provided.
                const finalZ = zLabel ? scaledZ : 0; 
                const pointPosition = [xPos, scaledY, finalZ];
                
                // Add the sphere point and labels
                visualizations.push(
                    <ScatterElement 
                        key={`point-${i}`}
                        position={pointPosition}
                        color={color}
                        label={d.label}
                        value={d.y} // Pass raw Y value for display
                    />
                );
                
                linePoints.push(new THREE.Vector3(xPos, scaledY, finalZ));
            }
        });
        
        // Render the connecting line for line3d chart type
        if (chartType === 'line3d' && linePoints.length > 1) {
            visualizations.push(
                <DreiLine
                    key="connecting-line"
                    points={linePoints}
                    color="#f05a82" 
                    lineWidth={5}
                />
            );
        }
        
        // NEW: Render 3D Table for Pie Chart
    // FIX: Adjust table position to account for new vertical orientation
    if (chartType === 'pie3d' && chartData.length > 0) {
    const tableX = BASE_RADIUS + 3;  // further right
    const tableY = MAX_HEIGHT;
    const tableZ = 2;                // forward stagger

    visualizations.push(
        <ChartText 
            key="table-title"
            position={[tableX + 1.5, tableY + 0.5, tableZ]} 
            size={0.3} 
            color="#fff" 
            anchorX="left"
        >
            Distribution Table:
        </ChartText>
    );

    chartData.forEach((d, i) => {
        const percentage = (d.y / totalY) * 100;
        visualizations.push(
            <ChartText 
                key={`table-row-${i}`}
                position={[tableX + 1.5, tableY - i * 0.5, tableZ]} 
                size={0.25} 
                color={colors[i % colors.length]}
                anchorX="left"
            >
                {`${d.label}: ${d.y.toFixed(2)} (${percentage.toFixed(1)}%)`}
            </ChartText>
        );
    });
}

        return visualizations;
    };
    
    // --- Scene Setup and Labels ---
    
    // Dynamic Axis Labels based on Chart Type
    const AxisLabels = useMemo(() => {
        if (chartType === 'pie3d') {
            // FIX: Position the title higher based on MAX_HEIGHT
            return (
                <ChartText position={[0, MAX_HEIGHT + 1, 0]} size={0.4}> //
                    {yLabel} Distribution ({xLabel} Categories)
                </ChartText>
            );
        } else {
            return (
                <group>
                    {/* X-Axis Label */}
                    <ChartText position={[centerOffset, 0.1, -1]} rotation={[-Math.PI / 2, 0, 0]} size={0.3}>
                        {xLabel}
                    </ChartText>
                    {/* Y-Axis Label */}
                    <ChartText position={[-1, MAX_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={0.3}>
                        {yLabel}
                    </ChartText>
                    {/* Z-Axis Label (Conditional) */}
                    {(chartType === 'scatter3d' || chartType === 'line3d') && zLabel && (
                        <ChartText position={[centerOffset, MAX_HEIGHT / 2, sceneWidth]} rotation={[0, 0, 0]} size={0.3}>
                            {zLabel}
                        </ChartText>
                    )}
                </group>
            );
        }
    }, [chartType, centerOffset, xLabel, yLabel, zLabel, sceneWidth]);


    return (
        <Canvas 
            style={{ width: '100%', height: '100%', background: '#171923' }}
            camera={{ 
                position: cameraPosition, 
                fov: 40 
            }}
        >
            {/* Lighting: Essential for seeing depth and colors */}
            <ambientLight intensity={1.5} />
            <directionalLight position={[sceneWidth, MAX_HEIGHT * 3, sceneWidth]} intensity={2.5} />
            
            {/* Render Visualization */}
            {renderVisualization()}

            {/* Ground Plane/Grid Helper (Only show for Cartesian charts, not Pie) */}
            {chartType !== 'pie3d' && (
                <gridHelper 
                    args={[sceneWidth + 2, numPoints + 1, '#444', '#444']} 
                    position={[centerOffset, 0, 0]} 
                />
            )}
            
            {/* Main Title (Fixed high position for Cartesian plots) */}
            {chartType !== 'pie3d' && (
                <ChartText position={[centerOffset, MAX_HEIGHT + 1, 0]} size={0.6}>
                    {chartType.toUpperCase()} Visualization
                </ChartText>
            )}
            
            {/* Dynamic Axis/Pie Labels */}
            {AxisLabels}

            {/* Controls: Zoom, Move, Turn View */}
            <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                target={targetPosition} 
                maxDistance={sceneWidth * 2.5 || 25}
            />
        </Canvas>
    );
};

export default ThreeDChart;
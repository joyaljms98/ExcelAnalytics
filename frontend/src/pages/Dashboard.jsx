import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DataChart from '../components/DataChart'; 
import ThreeDChart from '../components/ThreeDChart';
import { toPng } from 'html-to-image'; // <--- NEW IMPORT

/**
 * Infers the data type of a column (array of values).
 * @param {Array<any>} columnData - Array of values from a single column.
 * @returns {'numerical' | 'categorical' | 'mixed'}
 */
const inferDataType = (columnData) => {
    if (!columnData || columnData.length === 0) return 'categorical';
    
    // Sample a maximum of 100 values to speed things up
    const sample = columnData.slice(0, 100);
    
    // Count how many values can be parsed as a finite number
    let numericalCount = 0;
    
    sample.forEach(value => {
        // Exclude null/undefined/empty string values from counting against numerical type
        if (value === null || value === undefined || value === "") return;
        
        // Try to parse the value as a number. The value must be finite.
        const numValue = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(numValue) && isFinite(numValue)) {
            numericalCount++;
        }
    });

    const threshold = 0.8; // If more than 80% are numbers, treat as numerical
    
    if (numericalCount / sample.length >= threshold) {
        return 'numerical';
    } else if (numericalCount > 0) {
        // If there are some numbers but not enough to be numerical, treat as mixed/categorical
        return 'mixed';
    } else {
        // Mostly strings or non-numerical values
        return 'categorical';
    }
};

const Dashboard = () => {
    const navigate = useNavigate();

    // --- Authentication and User State ---
    const userInfo = localStorage.getItem('userInfo') 
        ? JSON.parse(localStorage.getItem('userInfo')) 
        : null;
    const token = userInfo ? userInfo.token : null; 
    const username = userInfo ? userInfo.username : 'User';
    const isAdmin = userInfo ? userInfo.isAdmin : false;

    // --- File & Data State ---
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dataReady, setDataReady] = useState(false);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [fileData, setFileData] = useState([]);
    const [history, setHistory] = useState([]);

    // --- Charting State ---
    const [xAxis, setXAxis] = useState('');
    const [yAxis, setYAxis] = useState('');
    const [zAxis, setZAxis] = useState(''); // NEW: For 3D charts
    const [chartType, setChartType] = useState('bar'); 
    const [chartConfig, setChartConfig] = useState(null);
    const chartRef = useRef(null); // Keep chartRef, but we'll use a new one for screenshot
    const chartDisplayRef = useRef(null); // <--- NEW: Ref for the entire chart section to screenshot
    const [isChartReady, setIsChartReady] = useState(false); 

    const [xAxisType, setXAxisType] = useState(null); // 'numerical' or 'categorical'
    const [yAxisType, setYAxisType] = useState(null);

    // --- AI State ---
    // Note: The value 'gemini' assumes you configured DEFAULT_AI_MODEL in .env
    const [geminiKey, setGeminiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [aiModel, setAiModel] = useState('gemini')
    const [aiSummary, setAiSummary] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

        // --- 1. Create a map of headers to their types ---
    const headerTypes = useMemo(() => {
        const types = {};
        fileHeaders.forEach(header => {
            const columnData = fileData.map(row => row[header]);
            types[header] = inferDataType(columnData);
        });
        return types;
    }, [fileHeaders, fileData]);

    // --- 2. Filter headers based on roles ---
    // A. Allowed X-Axis: Categorical or Mixed data types
    const allowedXAxes = fileHeaders.filter(header => 
        headerTypes[header] === 'categorical' || headerTypes[header] === 'mixed'
    );

    // B. Allowed Y-Axis: Strictly Numerical data type
    const allowedYAxes = fileHeaders.filter(header => 
        headerTypes[header] === 'numerical'
    );

    
    // --- Charting Helper ---
    const isChartTypeAvailable = (type) => {
        // If we don't have enough data types, always false
        if (!xAxisType || !yAxisType) return false;
        
        // Logic to restrict chart types based on inferred data:
        switch (type) {
            case 'pie':
                // 2D Pie: X must be categorical (labels), Y must be numerical (values)
                return xAxisType === 'categorical' && yAxisType === 'numerical';
            case 'scatter':
                // 2D Scatter: Both axes must be numerical
                return xAxisType === 'numerical' && yAxisType === 'numerical';
            case 'bar':
            case 'line':
                // 2D Bar/Line: X categorical/mixed/numerical, Y must be numerical
                return yAxisType === 'numerical'; // Relaxed X-axis type for general utility
                
            // --- 3D Charts: Focus on Y-axis for scaling ---
            case 'bar3d':
            case 'pie3d':
                // 3D Bar/Pie: Y must be numerical for height/size. X is used for categories.
                return yAxisType === 'numerical';
                
            case 'scatter3d':
            case 'line3d':
                // 3D Scatter/Line: Requires Y to be numerical. X can be treated as categorical sequence or numerical.
                // We'll allow generation as long as Y is numerical.
                return yAxisType === 'numerical';
                
            default:
                return true;
        }
    };

    // --- EFFECTS ---

    // --- NEW: Load API Keys from localStorage on mount ---
    useEffect(() => {
        const cachedGeminiKey = localStorage.getItem('geminiKey');
        const cachedOpenaiKey = localStorage.getItem('openaiKey');
        if (cachedGeminiKey) setGeminiKey(cachedGeminiKey);
        if (cachedOpenaiKey) setOpenaiKey(cachedOpenaiKey);
    }, []);

    // --- NEW: Handle key input and cache simultaneously ---
    const handleKeyChange = (keyType, value) => {
        if (keyType === 'gemini') {
            setGeminiKey(value);
            localStorage.setItem('geminiKey', value);
        } else if (keyType === 'openai') {
            setOpenaiKey(value);
            localStorage.setItem('openaiKey', value);
        }
    };

    // 1. Authentication Check and History Fetch (No change here)
    useEffect(() => {
        if (!userInfo) {
            navigate('/login');
        } else {
            fetchHistory();
        }
    }, [navigate, userInfo]); // Depend on userInfo to trigger on state change

    // 2. Chart Generation Logic (Runs when selections change) (No change here)
    useEffect(() => {
        if (dataReady && xAxis && yAxis && fileData.length > 0) {
            const getColumnData = (header) => fileData.map(row => row[header]);
            
            // Recalculate data type when X or Y changes
            const currentXType = inferDataType(getColumnData(xAxis));
            const currentYType = inferDataType(getColumnData(yAxis));
            setXAxisType(currentXType);
            setYAxisType(currentYType);

            // Only generate 2D chart data if type is a 2D chart
            if (['bar', 'line', 'pie', 'scatter'].includes(chartType)) { // <-- FIXED
                generateChartData();
            } else {
                setChartConfig(null);
            }
        } else {
            setChartConfig(null);
            setXAxisType(null);
            setYAxisType(null);
        }
    }, [xAxis, yAxis, chartType, fileData, dataReady]); 

    // 3. Warning/Error Timeout Effect (NEW)
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 5000); // 5 seconds (5000 milliseconds)

            // Cleanup function to prevent memory leaks if state changes before timeout
            return () => clearTimeout(timer);
        }
    }, [error]);

    // 4. API Key Loading (CLEANED UP)
    useEffect(() => {
        const cachedGeminiKey = localStorage.getItem('geminiKey');
        const cachedOpenaiKey = localStorage.getItem('openaiKey');
        if (cachedGeminiKey) setGeminiKey(cachedGeminiKey);
        if (cachedOpenaiKey) setOpenaiKey(cachedOpenaiKey);
    }, []); // Empty dependency array means it only runs once after the initial render

    // --- HISTORY FUNCTIONS ---

    const fetchHistory = async () => {
        if (!token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get('http://localhost:5000/api/excel/history', config);
            setHistory(data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    const saveAnalysisHistory = async (fileName) => {
        if (!token || !xAxis || !yAxis || !chartType) return;
        try {
            const config = {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            };
            await axios.post(
                'http://localhost:5000/api/excel/history',
                { fileName, x_axis: xAxis, y_axis: yAxis, chartType, z_axis: zAxis || null }, // Include zAxis
                config
            );
            fetchHistory(); 
        } catch (err) {
            console.error("Failed to save history:", err);
        }
    };

    // --- FILE HANDLING ---

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError(null);
        setDataReady(false);
        setChartConfig(null);
        setAiSummary(null); // Clear summary on new file
    };
    
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) { setError('Please select an Excel file to upload.'); return; }

        const formData = new FormData();
        formData.append('excelFile', file);
        setLoading(true); setError(null);

        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
            };

            // API call to protected upload route
            const { data } = await axios.post('http://localhost:5000/api/excel/upload', formData, config);

            setFileHeaders(data.headers);
            setFileData(data.data);
            setDataReady(true);
            setLoading(false);
            setAiSummary(null);

            // Auto-select first 2 or 3 headers
            if (data.headers.length >= 2) {
                setXAxis(data.headers[0]);
                setYAxis(data.headers[1]);
            }
            if (data.headers.length >= 3) {
                setZAxis(data.headers[2]);
            } else {
                setZAxis('');
            }
            
            saveAnalysisHistory(file.name); 

        } catch (err) {
            setLoading(false);
            setError(err.response && err.response.data.message ? err.response.data.message : 'File upload failed. Check file type and size.');
            setFileHeaders([]); setFileData([]); setChartConfig(null);
        }
    };

    // --- CHARTING FUNCTIONS ---
    const is2DChart = (type) => ['bar', 'line', 'pie', 'scatter'].includes(type);

    const generateChartData = () => {
        if (!fileHeaders.includes(xAxis) || !fileHeaders.includes(yAxis)) return;
        
        const toNumeric = (value) => {
            const num = parseFloat(String(value).replace(/,/g, '')) || 0;
            return isFinite(num) ? num : 0;
        };
        // ... (rest of the logic for labels, dataPoints, scatterData, chartJsData) ...

        let chartJsData;
        const baseColor = 'rgba(167, 139, 250, 0.8)';
        
        if (chartType === 'scatter') {
            // ... (scatter logic) ...
            const scatterData = fileData.map(row => ({
                x: toNumeric(row[xAxis]),
                y: toNumeric(row[yAxis]),
            }));

            chartJsData = {
                datasets: [
                    {
                        label: `${yAxis} vs ${xAxis}`,
                        data: scatterData,
                        backgroundColor: baseColor,
                        pointRadius: 5,
                    },
                ],
            };
        } else if (chartType === 'pie') {
            // ... (pie logic) ...
            const labels = fileData.map(row => row[xAxis]);
            const dataPoints = fileData.map(row => toNumeric(row[yAxis]));

            chartJsData = {
                labels: labels,
                datasets: [
                    {
                        label: `${yAxis} Distribution`,
                        data: dataPoints,
                        backgroundColor: [
                            'rgba(167, 139, 250, 0.8)',
                            'rgba(240, 90, 130, 0.8)',
                            'rgba(100, 200, 255, 0.8)',
                            'rgba(255, 200, 90, 0.8)',
                            'rgba(150, 250, 150, 0.8)',
                        ],
                        hoverOffset: 4,
                    },
                ],
            };
        } else { // Bar and Line charts
            const labels = fileData.map(row => row[xAxis]);
            const dataPoints = fileData.map(row => toNumeric(row[yAxis]));

            chartJsData = {
                labels: labels,
                datasets: [
                    {
                        label: `${yAxis}`,
                        data: dataPoints,
                        backgroundColor: chartType === 'bar' ? baseColor : 'transparent',
                        borderColor: baseColor,
                        borderWidth: 1,
                        tension: chartType === 'line' ? 0.4 : 0,
                    },
                ],
            };
        }

        setChartConfig(chartJsData);
        
    };



    // --- UNIVERSAL DOWNLOAD FUNCTION (NEW) ---
    const handleDownloadChart = async () => {
        if (!dataReady || !chartDisplayRef.current) {
            setError("Chart display area is not ready or no data is loaded.");
            return;
        }

        setError(null);

        try {
            // Use html-to-image to convert the entire chart display section to a PNG
            const dataUrl = await toPng(chartDisplayRef.current, {
                quality: 0.95, // Set image quality
                backgroundColor: '#171923', // Match background color for smooth edge
            });

            // Create a temporary link element for download
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `analytics-${chartType}-${new Date().toISOString()}.png`;
            
            // Execute the download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (error) {
            console.error("Screenshot download failed:", error);
            setError("Download failed. An error occurred while capturing the chart.");
        }
    };

    const is3DChart = (type) => ['bar3d', 'pie3d', 'line3d', 'scatter3d'].includes(type);


    // --- AI FUNCTIONS ---

    const handleGetAiSummary = async () => {
        if (!token || !dataReady) return;

        // Determine which key and model to use
        const keyToUse = aiModel === 'gemini' ? geminiKey : openaiKey;

        if (!keyToUse) {
            setError(`Please enter a valid ${aiModel} API key.`);
            return;
        }

        setAiLoading(true);
        setAiSummary(null);

        try {
            const config = {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            };

            // The request body must now include the API Key
            const { data } = await axios.post(
                'http://localhost:5000/api/excel/summary',
                { 
                    headers: fileHeaders, 
                    data: fileData, 
                    model: aiModel,
                    apiKey: keyToUse // <-- SEND KEY TO BACKEND
                },
                config
            );

            setAiSummary(data.summary);
            setAiLoading(false);
        } catch (err) {
            setAiLoading(false);
            setAiSummary(`Error: ${err.response?.data?.message || err.message}. Check your API key or server connection.`);
            console.error("AI Summary Error:", err);
            setError('Failed to get AI Summary. Check API key and server logs.');
        }
    };


    // --- RENDER ---
    return (
        <div className="p-8 bg-gray-900 min-h-full">
            <h1 className="text-4xl font-bold text-purple-400 mb-8">
                Welcome, {username}! {isAdmin && <span className="text-sm bg-red-800 px-3 py-1 rounded-full ml-3">ADMIN</span>}
            </h1>
            
            {error && (
                <div className="bg-red-800 p-4 rounded-lg mb-4 text-white">
                    {error} 
                    <p className="text-xs mt-1 text-gray-200">This message will disappear in 5 seconds.</p>
                </div>
            )}
            
            <div className="flex">
                {/* LEFT SIDEBAR: Controls and History */}
                <div className="w-1/4 pr-6">
                    <div className="p-6 bg-gray-800 rounded-lg shadow-xl space-y-6 sticky top-4">
                        <h2 className="text-2xl font-semibold text-purple-400 mb-4">Chart Settings</h2>
                        
                        {/* 1. File Upload */}
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <h3 className="text-xl font-medium text-white">1. File Upload</h3>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".xls, .xlsx"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <button
                                    type="button"
                                    className="w-full py-2 px-4 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 transition duration-300"
                                >
                                    Choose Excel File
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={!file || loading}
                                className={`w-full py-2 px-4 rounded-lg font-bold transition duration-300 
                                    ${!file || loading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            >
                                {loading ? 'Processing...' : 'Analyze Data'}
                            </button>
                        </form>

                        {/* 2. Data Mapping */}
                        <div className="pt-4 border-t border-gray-700 space-y-4" >
                            <h3 className="text-xl font-medium text-white">2. Data Mapping</h3>
                            
                        {/* X-Axis Selector (Label) - Uses allowedXAxes */}
                        <div>
                            <label className="block text-gray-400 mb-1">X-Axis (Label - Categorical/Mixed)</label>
                            <select
                                value={xAxis}
                                onChange={(e) => setXAxis(e.target.value)}
                                disabled={!dataReady}
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                            >
                                <option value="">Select X-Axis</option>
                                {allowedXAxes.map((header) => (
                                    <option key={header} value={header}>
                                        {header}
                                    </option>
                                ))}
                            </select>
                            {/* Optional: Add a warning if the currently selected axis is invalid for the other */}
                            {xAxis && !allowedXAxes.includes(xAxis) && (
                                <p className="text-red-400 text-xs mt-1">Warning: Selected X-Axis is not Categorical or Mixed.</p>
                            )}
                        </div>

                        {/* Y-Axis Selector (Value) - Uses allowedYAxes */}
                        <div>
                            <label className="block text-gray-400 mb-1">Y-Axis (Value - Numerical)</label>
                            <select
                                value={yAxis}
                                onChange={(e) => setYAxis(e.target.value)}
                                disabled={!dataReady}
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                            >
                                <option value="">Select Y-Axis</option>
                                {allowedYAxes.map((header) => (
                                    <option key={header} value={header}>
                                        {header}
                                    </option>
                                ))}
                            </select>
                            {/* Optional: Add a warning if the currently selected axis is invalid */}
                            {yAxis && !allowedYAxes.includes(yAxis) && (
                                <p className="text-red-400 text-xs mt-1">Warning: Selected Y-Axis is not strictly Numerical.</p>
                            )}
                        </div>
                            
                            {/* Z-Axis Selector (Conditional for 3D) */}
                            {(chartType === 'bar3d') && (
                                <div>
                                    <label className="block text-gray-400 mb-1">Z-Axis (Depth/Group)</label>
                                    <select
                                        value={zAxis}
                                        onChange={(e) => setZAxis(e.target.value)}
                                        disabled={!dataReady}
                                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    >
                                        <option value="">Select Z-Axis</option>
                                        {fileHeaders.map((header) => (
                                            <option key={header} value={header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Chart Type Selector (UPDATED) */}
                                <div>
                                    <label className="block text-gray-400 mb-1">Chart Type</label>
                                        <select
                                            value={chartType}
                                            onChange={(e) => setChartType(e.target.value)}
                                            disabled={!dataReady}
                                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                        >
                                            {/* 2D Charts (Keep the existing 2D types) */}
                                            {/* Bar Chart */}
                                            <option value="bar" disabled={!isChartTypeAvailable('bar')}> 
                                                Bar (2D) {isChartTypeAvailable('bar') ? '' : `(X: ${xAxisType}, Y: ${yAxisType})`}
                                            </option>
                                            {/* Line Chart */}
                                            <option value="line" disabled={!isChartTypeAvailable('line')}>
                                                Line {isChartTypeAvailable('line') ? '' : `(X: ${xAxisType}, Y: ${yAxisType})`}
                                            </option>
                                            {/* Pie Chart */}
                                            <option value="pie" disabled={!isChartTypeAvailable('pie')}>
                                                Pie {isChartTypeAvailable('pie') ? '' : `(X: ${xAxisType}, Y: ${yAxisType})`}
                                            </option>
                                            {/* Scatter Plot */}
                                            <option value="scatter" disabled={!isChartTypeAvailable('scatter')}>
                                                Scatter {isChartTypeAvailable('scatter') ? '' : `(X: ${xAxisType}, Y: ${yAxisType})`}
                                            </option>

                                            {/* NEW 3D Charts */}
                                            {/* 3D Column */}
                                                <option value="bar3d" disabled={!isChartTypeAvailable('bar3d')}>3D Column</option>
                                                <option value="pie3d" disabled={!isChartTypeAvailable('pie3d')}>3D Pie</option>
                                                <option value="line3d" disabled={!isChartTypeAvailable('line3d')}>3D Line</option>
                                                <option value="scatter3d" disabled={!isChartTypeAvailable('scatter3d')}>3D Scatter</option>
                                        </select>
                                    </div>
                                </div>
                        
                        {/* 3. AI Model Selection & Key Entry */}
                        <div className="pt-4 border-t border-gray-700 space-y-4">
                            <h3 className="text-xl font-medium text-white">3. AI Model & Key</h3>

                            {/* Model Selector (Now dictates which key field is active) */}
                            <div>
                                <label className="block text-gray-400 mb-1">Select Model</label>
                                <select
                                    value={aiModel}
                                    onChange={(e) => {
                                        setAiModel(e.target.value);
                                        // Clear current summary when model changes
                                        setAiSummary(null); 
                                    }}
                                    disabled={!dataReady || aiLoading}
                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI GPT-3.5</option>
                                </select>
                            </div>

                            {/* Gemini Key Input (Conditional Visibility) */}
                            {aiModel === 'gemini' && (
                                <div>
                                    <label className="block text-gray-400 mb-1 flex justify-between items-center">
                                        Gemini API Key
                                        <a 
                                            href="https://aistudio.google.com/app/api-keys" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        >
                                            Get Key
                                        </a>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter Gemini API Key"
                                        value={geminiKey}
                                        onChange={(e) => handleKeyChange('gemini', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* OpenAI Key Input (Conditional Visibility) */}
                            {aiModel === 'openai' && (
                                <div>
                                    <label className="block text-gray-400 mb-1 flex justify-between items-center">
                                        OpenAI API Key
                                        <a 
                                            href="https://platform.openai.com/api-keys" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        >
                                            Get Key
                                        </a>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter OpenAI API Key"
                                        value={openaiKey}
                                        onChange={(e) => handleKeyChange('openai', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* 4. Action Buttons */}
                        <div className="pt-4 border-t border-gray-700 space-y-3">
                            <button
                                onClick={handleDownloadChart}
                                // Enabled if dataReady, it's a 2D chart, AND the delayed state says it's ready
                                disabled={!dataReady || !is2DChart(chartType) && !is3DChart(chartType)} 
                                className={`w-full py-2 px-4 rounded-lg font-bold transition duration-300 
                                    ${!dataReady || (!is2DChart(chartType) && !is3DChart(chartType)) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                            >
                                Download Chart (PNG)
                            </button>
                        {/* ... (AI Summary button) ... */}
                            <button
                                onClick={handleGetAiSummary}
                                disabled={!dataReady || aiLoading}
                                className={`w-full py-2 px-4 rounded-lg font-bold transition duration-300 
                                    ${!dataReady || aiLoading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {aiLoading ? 'Generating Summary...' : 'Get AI Summary'}
                            </button>
                        </div>
                    </div>
                    
                    {/* History Panel */}
                    <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-xl">
                        <h3 className="text-xl font-medium text-white mb-4 border-b border-gray-700 pb-2">Upload History</h3>
                        {history.length === 0 ? (
                            <p className="text-gray-400 text-sm">No analysis history found.</p>
                        ) : (
                            <ul className="space-y-3 max-h-96 overflow-y-auto">
                                {history.map((item) => (
                                    <li key={item._id} className="p-3 bg-gray-700/50 rounded-lg border-l-4 border-purple-500">
                                        <p className="text-sm font-semibold text-white truncate">{item.fileName}</p>
                                        <p className="text-xs text-gray-400">
                                            {item.x_axis} vs {item.y_axis} ({item.chartType})
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: Chart Display and Summary */}
                <div className="w-3/4 pl-6">
                    <h1 className="text-3xl font-bold text-white mb-6">
                        {/* Simplified Title Logic for the new chart types */}
                        {dataReady && (is2DChart(chartType) || is3DChart(chartType)) 
                            ? `${chartType.toUpperCase()} Chart` 
                            : 'Upload Data to Visualize'}
                    </h1>
                    
                    {/* 1. The universal wrapper for screenshot (html-to-image) */}
                    <div ref={chartDisplayRef} className="chart-display-wrapper"> 
                        
                        {/* Consolidated Chart Rendering Logic */}
                        {is2DChart(chartType) && chartConfig ? (
                            // A. Renders 2D Chart (Bar, Line, Pie, Scatter)
                            <DataChart 
                                ref={chartRef} // Keeping the ref, though not strictly needed for download now
                                chartData={chartConfig}
                                chartType={chartType}
                                xLabel={xAxis}
                                yLabel={yAxis}
                                chartTitle={`Analysis of ${yAxis} by ${xAxis}`}
                            />
                            ) : (is3DChart(chartType) && dataReady && xAxis && yAxis) ? ( // <--- MODIFIED CHECK: Ensure X and Y are selected
                                // B. Renders 3D Chart
                                <div className="h-[500px] w-full bg-gray-900 rounded-lg shadow-2xl">
                                    <ThreeDChart 
                                        data={fileData} 
                                        xLabel={xAxis} 
                                        yLabel={yAxis} 
                                        zLabel={zAxis} // zAxis can be an empty string, which is handled in ThreeDChart.jsx
                                        chartType={chartType} 
                                    />
                                </div>
                            ) : (
                            // C. Placeholder when no chart is selected/available
                            <div className="h-[500px] flex items-center justify-center bg-gray-800 rounded-lg text-gray-500 text-xl shadow-2xl">
                                {dataReady ? 'Select chart type and valid axes to generate a chart.' : 'Upload an Excel file to begin analysis.'}
                            </div>
                        )}
                        
                    </div> {/* End of chartDisplayRef wrapper */}
                    
                    {/* AI Summary Display */}
                    {aiSummary && (
                        <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-xl">
                            <h2 className="text-2xl font-semibold text-blue-400 mb-4">AI Analysis Summary ({aiModel.toUpperCase()})</h2>
                            <pre className="whitespace-pre-wrap text-gray-300 bg-gray-700 p-4 rounded text-sm">
                                {aiSummary}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};



export default Dashboard;
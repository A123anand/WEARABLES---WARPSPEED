const hardcodedCSV =
    'timestamp,imu_upper_roll_deg,imu_upper_pitch_deg,imu_upper_yaw_deg,imu_lower_roll_deg,imu_lower_pitch_deg,imu_lower_yaw_deg';

// ===== BLE =====
const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_UART_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_UART_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let bleDevice = null;
let bleServer = null;
let txCharacteristic = null;
let rxCharacteristic = null;

// ===== LIVE DATA ACCUMULATOR =====
// All rows received over BLE are stored here
let liveRows = [];

async function connectBLE() {
    if (!navigator.bluetooth) {
        setBLEState('Web Bluetooth unsupported', false, true);
        appendLog('This browser does not support Web Bluetooth. Use Chrome, Edge, or Android Chrome.');
        return;
    }
    try {
        appendLog('Requesting BLE device...');
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'PostureShirt' }],
            optionalServices: [NORDIC_UART_SERVICE]
        });
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        appendLog('Connecting to ' + (bleDevice.name || 'device') + '...');
        bleServer = await bleDevice.gatt.connect();
        const service = await bleServer.getPrimaryService(NORDIC_UART_SERVICE);
        txCharacteristic = await service.getCharacteristic(NORDIC_UART_TX);
        rxCharacteristic = await service.getCharacteristic(NORDIC_UART_RX);
        await txCharacteristic.startNotifications();
        txCharacteristic.addEventListener('characteristicvaluechanged', handleBLEPacket);
        setBLEState('Connected', true, false);
        appendLog('Connected and notifications started.');

        // Clear any old live data when a new session starts
        liveRows = [];
        updateLiveMetrics(null);
    } catch (error) {
        setBLEState('Connection failed', false, true);
        appendLog('BLE error: ' + error.message);
    }
}

function disconnectBLE() {
    if (txCharacteristic) {
        try { txCharacteristic.removeEventListener('characteristicvaluechanged', handleBLEPacket); } catch (e) {}
    }
    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
    onDisconnected();
}

function setBLEState(status, connected = false, isError = false) {
    const pill = document.getElementById('bleStatusPill');
    const text = document.getElementById('bleStatusText');
    text.textContent = status;
    pill.classList.toggle('connected', connected);
    pill.classList.toggle('error', isError);
    document.getElementById('connectBtn').disabled = connected;
    document.getElementById('disconnectBtn').disabled = !connected;
}

function appendLog(message) {
    const log = document.getElementById('bleLog');
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `\n[${timestamp}] ${message}`;
    log.scrollTop = log.scrollHeight;
}

function onDisconnected() {
    txCharacteristic = null;
    rxCharacteristic = null;
    bleServer = null;
    setBLEState('Disconnected');
    appendLog('Device disconnected.');
}

async function calibrateDevice() {
    // Guard: only attempt if connected
    if (!rxCharacteristic) {
        appendLog('Calibrate failed: device not connected.');
        return;
    }
    try {
        const encoder = new TextEncoder();
        await rxCharacteristic.writeValueWithResponse(encoder.encode('CALIBRATE'));
        appendLog('Calibration command sent.');
    } catch (e) {
        appendLog('Calibrate error: ' + e.message);
    }
}

// ===== BLE PACKET HANDLER =====
// Your firmware sends one JSON packet per second:
//   {"t_ms": 1234, "angle": 12.34, "status": "MILD - Slight bend"}
// We map this onto the CSV schema so the same chart functions work for both
// BLE live data and uploaded CSVs.

function handleBLEPacket(event) {
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(event.target.value);
    appendLog('RX: ' + raw.trim());

    const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
        let packet;
        try {
            packet = JSON.parse(line);
        } catch (e) {
            appendLog('Ignored non-JSON payload.');
            continue;
        }

        // Build a row that matches the CSV schema.
        // The firmware only sends a single "angle" (pitch difference between
        // the two IMUs), so we populate imu_upper_pitch_deg with it and
        // leave roll/lower columns as 0 until richer firmware data arrives.
        const row = {
            timestamp:           packet.t_ms,
            imu_upper_roll_deg:  0,
            imu_upper_pitch_deg: packet.angle,
            imu_upper_yaw_deg:   0,
            imu_lower_roll_deg:  0,
            imu_lower_pitch_deg: 0,
            imu_lower_yaw_deg:   0,
            status:              packet.status
        };

        liveRows.push(row);

        // Update the live metrics panel
        updateLiveMetrics(packet);

        // Append one point to charts (fast path – no full table re-render)
        appendToCharts(row);

        // Keep the data table in sync (rebuilds the table only, not charts)
        refreshTable(liveRows);
    }
}

// ===== LIVE METRICS =====

function updateLiveMetrics(packet) {
    const angleEl  = document.getElementById('currentAngle');
    const statusEl = document.getElementById('currentStatus');
    const countEl  = document.getElementById('sampleCount');

    if (!packet) {
        if (angleEl)  angleEl.textContent  = '--°';
        if (statusEl) statusEl.textContent = '--';
        if (countEl)  countEl.textContent  = '0';
        return;
    }
    if (angleEl)  angleEl.textContent  = (packet.angle !== undefined ? packet.angle.toFixed(1) + '°' : '--°');
    if (statusEl) statusEl.textContent = packet.status || '--';
    if (countEl)  countEl.textContent  = liveRows.length;
}

// ===== AUTH =====

function logIn() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const stored = localStorage.getItem(username.value);

    if (stored === null) {
        alert("Username not found. Please sign up first.");
        return;
    }
    if (stored !== password.value) {
        alert("Incorrect password. Please try again.");
        return;
    }

    const authScreen = document.getElementById("authScreen");
    const homeScreen = document.getElementById("homeScreen");

    document.getElementById("welcomeMsg").textContent = "Welcome, " + username.value + "!";

    authScreen.classList.add("fade-out");
    setTimeout(() => {
        authScreen.style.display = "none";
        homeScreen.style.display = "block";
        setTimeout(() => homeScreen.classList.add("visible"), 20);
    }, 400);

    load_data(true);
}

function logOut() {
    const authScreen = document.getElementById("authScreen");
    const homeScreen = document.getElementById("homeScreen");

    homeScreen.classList.remove("visible");
    setTimeout(() => {
        homeScreen.style.display = "none";
        authScreen.classList.remove("fade-out");
        authScreen.style.display = "block";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        document.getElementById("output").innerHTML =
            '<div class="empty-state"><p>📡 No data yet. Connect your device or upload a CSV to get started.</p></div>';
    }, 400);
}

function switchTab(tab) {
    if (tab === 'login') {
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("signupForm").style.display = "none";
        document.getElementById("loginTab").classList.add("active");
        document.getElementById("signupTab").classList.remove("active");
    } else {
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("signupForm").style.display = "block";
        document.getElementById("loginTab").classList.remove("active");
        document.getElementById("signupTab").classList.add("active");
    }
}

// ===== PAGE NAVIGATION =====

function showPage(page) {
    document.getElementById("pageData").style.display = page === 'data' ? 'block' : 'none';
    document.getElementById("pageResources").style.display = page === 'resources' ? 'block' : 'none';
    document.getElementById("navData").classList.toggle("active", page === 'data');
    document.getElementById("navResources").classList.toggle("active", page === 'resources');
}

// ===== DATA LOADING =====

function load_data(a) {
    if (a === true) {
        fetch('http://127.0.0.1:5000/data')
            .then(response => response.json())
            .then(data => displayData(data))
            .catch(error => {
                console.error('Could not connect to server:', error);
                const rows = hardcodedCSV.split('\n');
                const headers = rows[0].split(',');
                const data = [];
                for (let i = 1; i < rows.length; i++) {
                    const obj = {};
                    const curr_row = rows[i].split(',');
                    for (let j = 0; j < headers.length; j++) {
                        obj[headers[j]] = curr_row[j];
                    }
                    data.push(obj);
                }
                displayData(data);
            });
    }
}

// ===== CSV FILE UPLOAD =====

function handleCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
        const data = parseCSV(reader.result);
        // CSV upload replaces live data
        liveRows = data;
        displayData(data);
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const rows = text.trim().split('\n');
    const headers = rows[0].split(',');
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const obj = {};
        const curr_row = rows[i].split(',');
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = curr_row[j];
        }
        data.push(obj);
    }
    return data;
}

// ===== CHART STATE =====

let chartInstance  = null;   // postureChart  (upper/lower roll)
let chartInstance1 = null;   // postureChart2 (all 4 channels)

// ===== FULL CHART BUILD (used for CSV uploads / initial load) =====

function tablechart(data) {
    const canvas = document.getElementById("postureChart");
    canvas.style.display = "block";

    const labels    = data.map(row => row["timestamp"] || "");
    const upperRoll = data.map(row => parseFloat(row["imu_upper_roll_deg"]) || 0);
    const lowerRoll = data.map(row => parseFloat(row["imu_lower_roll_deg"]) || 0);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Upper Roll (°)", data: upperRoll, borderColor: "#4f8ef7", tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
                { label: "Lower Roll (°)", data: lowerRoll, borderColor: "#f76f4f", tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 }
            ]
        },
        options: {
            responsive: true,
            animation: false,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { title: { display: true, text: "Timestamp" } },
                y: { title: { display: true, text: "Degrees" } }
            }
        }
    });
}

function tablechart2(data) {
    const canvas = document.getElementById("postureChart2");
    canvas.style.display = "block";

    const labels     = data.map(row => row["timestamp"] || "");
    const upperRoll  = data.map(row => parseFloat(row["imu_upper_roll_deg"])  || 0);
    const lowerRoll  = data.map(row => parseFloat(row["imu_lower_roll_deg"])  || 0);
    const upperPitch = data.map(row => parseFloat(row["imu_upper_pitch_deg"]) || 0);
    const lowerPitch = data.map(row => parseFloat(row["imu_lower_pitch_deg"]) || 0);

    if (chartInstance1) chartInstance1.destroy();

    chartInstance1 = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Upper Roll (°)",  data: upperRoll,  borderColor: "#3fb950", backgroundColor: "rgba(63,185,80,0.1)",  tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
                { label: "Lower Roll (°)",  data: lowerRoll,  borderColor: "#fbf6c8", backgroundColor: "rgba(251,246,200,0.1)", tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
                { label: "Upper Pitch (°)", data: upperPitch, borderColor: "#7cc7ff", backgroundColor: "rgba(124,199,255,0.1)", tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
                { label: "Lower Pitch (°)", data: lowerPitch, borderColor: "#f0a830", backgroundColor: "rgba(240,168,48,0.1)",  tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 }
            ]
        },
        options: {
            responsive: true,
            animation: false,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { title: { display: true, text: "Timestamp" } },
                y: { title: { display: true, text: "Degrees" } }
            }
        }
    });
}

// ===== INCREMENTAL CHART UPDATE (used for every live BLE packet) =====
// Instead of destroying and rebuilding the chart on every packet (which caused
// the graphs to never visibly accumulate data), we push one new point onto
// the existing Chart.js datasets and call update('none') to skip animation.

function appendToCharts(row) {
    const label      = row["timestamp"] || "";
    const upperRoll  = parseFloat(row["imu_upper_roll_deg"])  || 0;
    const lowerRoll  = parseFloat(row["imu_lower_roll_deg"])  || 0;
    const upperPitch = parseFloat(row["imu_upper_pitch_deg"]) || 0;
    const lowerPitch = parseFloat(row["imu_lower_pitch_deg"]) || 0;

    // --- Chart 1: roll only ---
    if (!chartInstance) {
        // First packet ever — build the chart with one point
        tablechart([row]);
    } else {
        chartInstance.data.labels.push(label);
        chartInstance.data.datasets[0].data.push(upperRoll);
        chartInstance.data.datasets[1].data.push(lowerRoll);
        chartInstance.update('none');   // 'none' skips animation for performance
    }

    // --- Chart 2: all 4 channels ---
    if (!chartInstance1) {
        tablechart2([row]);
    } else {
        chartInstance1.data.labels.push(label);
        chartInstance1.data.datasets[0].data.push(upperRoll);
        chartInstance1.data.datasets[1].data.push(lowerRoll);
        chartInstance1.data.datasets[2].data.push(upperPitch);
        chartInstance1.data.datasets[3].data.push(lowerPitch);
        chartInstance1.update('none');
    }
}

// ===== TABLE REFRESH (no chart rebuild) =====
// Rebuilds only the HTML table; leaves charts untouched.

function refreshTable(data) {
    const output = document.getElementById("output");
    if (!data || data.length === 0) {
        output.innerHTML = '<div class="empty-state"><p>📡 No data rows found. Check your CSV or device connection.</p></div>';
        return;
    }
    const headers = Object.keys(data[0]);
    let table = "<table><tr>";
    headers.forEach(h => table += `<th>${h}</th>`);
    table += "</tr>";
    data.forEach(row => {
        table += "<tr>";
        headers.forEach(h => table += `<td>${row[h] !== undefined ? row[h] : ''}</td>`);
        table += "</tr>";
    });
    table += "</table>";
    output.innerHTML = table;
}

// ===== DISPLAY DATA (full rebuild — CSV uploads / server fetch) =====

function displayData(data) {
    const output = document.getElementById("output");

    if (!data || data.length === 0) {
        output.innerHTML = '<div class="empty-state"><p>📡 No data rows found. Check your CSV or device connection.</p></div>';
        return;
    }

    refreshTable(data);
    tablechart(data);
    tablechart2(data);
}

function destroyChart() {
    if (chartInstance)  { chartInstance.destroy();  chartInstance  = null; }
    if (chartInstance1) { chartInstance1.destroy(); chartInstance1 = null; }
    document.getElementById('postureChart').style.display  = 'none';
    document.getElementById('postureChart2').style.display = 'none';
}
// const hardcodedCSV =
//     'timestamp,imu_upper_roll_deg,imu_upper_pitch_deg,imu_upper_yaw_deg,imu_lower_roll_deg,imu_lower_pitch_deg,imu_lower_yaw_deg';

// // ===== AUTH =====
// // const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// //         const NORDIC_UART_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
// //         const NORDIC_UART_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// //         let bleDevice = null;
// //         let bleServer = null;
// //         let txCharacteristic = null;
// //         let rxCharacteristic = null;
// //         let chart = null;
// //         let liveRows = [];
// //     async function initBle(service) {
// //             rxCharacteristic = await service.getCharacteristic(RX_UUID);
// //         }

// //     async function calibrateDevice() {
// //         const encoder = new TextEncoder();
// //         await rxCharacteristic.writeValueWithResponse(encoder.encode('CALIBRATE'));
// //     }
// const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// const NORDIC_UART_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
// const NORDIC_UART_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// let bleDevice = null;
// let bleServer = null;
// let txCharacteristic = null;
// let rxCharacteristic = null;

// async function connectBLE() {
//     if (!navigator.bluetooth) {
//         setBLEState('Web Bluetooth unsupported', false, true);
//         appendLog('This browser does not support Web Bluetooth. Use Chrome, Edge, or Android Chrome.');
//         return;
//     }
//     try {
//         appendLog('Requesting BLE device...');
//         bleDevice = await navigator.bluetooth.requestDevice({
//             filters: [{ namePrefix: 'PostureShirt' }],
//             optionalServices: [NORDIC_UART_SERVICE]
//         });
//         bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
//         appendLog('Connecting to ' + (bleDevice.name || 'device') + '...');
//         bleServer = await bleDevice.gatt.connect();
//         const service = await bleServer.getPrimaryService(NORDIC_UART_SERVICE);
//         txCharacteristic = await service.getCharacteristic(NORDIC_UART_TX);
//         rxCharacteristic = await service.getCharacteristic(NORDIC_UART_RX);
//         await txCharacteristic.startNotifications();
//         txCharacteristic.addEventListener('characteristicvaluechanged', handleBLEPacket);
//         setBLEState('Connected', true, false);
//         appendLog('Connected and notifications started.');
//     } catch (error) {
//         setBLEState('Connection failed', false, true);
//         appendLog('BLE error: ' + error.message);
//     }
// }

// function disconnectBLE() {
//     if (txCharacteristic) {
//         try { txCharacteristic.removeEventListener('characteristicvaluechanged', handleBLEPacket); } catch (e) {}
//     }
//     if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
//         bleDevice.gatt.disconnect();
//     }
//     onDisconnected();
// }
// function setBLEState(status, connected = false, isError = false) {
//     const pill = document.getElementById('bleStatusPill');
//     const text = document.getElementById('bleStatusText');
//     text.textContent = status;
//     pill.classList.toggle('connected', connected);
//     pill.classList.toggle('error', isError);
//     document.getElementById('connectBtn').disabled = connected;
//     document.getElementById('disconnectBtn').disabled = !connected;
// }

// function appendLog(message) {
//     const log = document.getElementById('bleLog');
//     const timestamp = new Date().toLocaleTimeString();
//     log.textContent += `\n[${timestamp}] ${message}`;
//     log.scrollTop = log.scrollHeight;
// }
// function onDisconnected() {
//     txCharacteristic = null;
//     rxCharacteristic = null;
//     bleServer = null;
//     setBLEState('Disconnected');
//     appendLog('Device disconnected.');
// }

// async function calibrateDevice() {
//     const encoder = new TextEncoder();
//     await rxCharacteristic.writeValueWithResponse(encoder.encode('CALIBRATE'));
// }

// function handleBLEPacket(event) {
//     const decoder = new TextDecoder('utf-8');
//     const raw = decoder.decode(event.target.value);
//     appendLog('RX: ' + raw.trim());
//     const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
//     for (const line of lines) {
//         try {
//             const packet = JSON.parse(line);
//             displayData([{
//                 timestamp:           packet.t_ms,
//                 imu_upper_pitch_deg: packet.angle,
//                 imu_upper_roll_deg:  0,
//                 imu_lower_roll_deg:  0,
//                 imu_lower_pitch_deg: 0,
//                 status:              packet.status
//             }]);
//         } catch (e) {
//             appendLog('Ignored non-JSON payload.');
//         }
//     }
// }
// function logIn() {
//     const username = document.getElementById("username");
//     const password = document.getElementById("password");
//     const stored = localStorage.getItem(username.value);

//     if (stored === null) {
//         alert("Username not found. Please sign up first.");
//         return;
//     }
//     if (stored !== password.value) {
//         alert("Incorrect password. Please try again.");
//         return;
//     }

//     // ---- Successful login: transition to home screen ----
//     const authScreen = document.getElementById("authScreen");
//     const homeScreen = document.getElementById("homeScreen");

//     // Show welcome message with username
//     document.getElementById("welcomeMsg").textContent = "Welcome, " + username.value + "!";

//     // Fade auth out, then show home
//     authScreen.classList.add("fade-out");
//     setTimeout(() => {
//         authScreen.style.display = "none";
//         homeScreen.style.display = "block";
//         setTimeout(() => homeScreen.classList.add("visible"), 20);
//     }, 400);

//     load_data(true);
// }

// function logOut() {
//     const authScreen = document.getElementById("authScreen");
//     const homeScreen = document.getElementById("homeScreen");

//     // Fade home out
//     homeScreen.classList.remove("visible");
//     setTimeout(() => {
//         homeScreen.style.display = "none";

//         // Reset auth screen
//         authScreen.classList.remove("fade-out");
//         authScreen.style.display = "block";

//         // Clear input fields
//         document.getElementById("username").value = "";
//         document.getElementById("password").value = "";

//         // Clear data output
//         document.getElementById("output").innerHTML =
//             '<div class="empty-state"><p>📡 No data yet. Connect your device or upload a CSV to get started.</p></div>';
//     }, 400);
// }

// function switchTab(tab) {
//     if (tab === 'login') {
//         document.getElementById("loginForm").style.display = "block";
//         document.getElementById("signupForm").style.display = "none";
//         document.getElementById("loginTab").classList.add("active");
//         document.getElementById("signupTab").classList.remove("active");
//     } else {
//         document.getElementById("loginForm").style.display = "none";
//         document.getElementById("signupForm").style.display = "block";
//         document.getElementById("loginTab").classList.remove("active");
//         document.getElementById("signupTab").classList.add("active");
//     }
// }

// // ===== PAGE NAVIGATION =====

// function showPage(page) {
//     document.getElementById("pageData").style.display = page === 'data' ? 'block' : 'none';
//     document.getElementById("pageResources").style.display = page === 'resources' ? 'block' : 'none';

//     document.getElementById("navData").classList.toggle("active", page === 'data');
//     document.getElementById("navResources").classList.toggle("active", page === 'resources');
// }

// // ===== DATA LOADING =====

// function load_data(a) {
//     if (a === true) {
//         // Try to fetch live data from Flask server
//         fetch('http://127.0.0.1:5000/data')
//             .then(response => response.json())
//             .then(data => displayData(data))
//             .catch(error => {
//                 console.error('Could not connect to server:', error);
//                 // Fall back to parsing the hardcoded CSV header (no rows yet)
//                 const rows = hardcodedCSV.split('\n');
//                 const headers = rows[0].split(',');
//                 const data = [];
//                 for (let i = 1; i < rows.length; i++) {
//                     const obj = {};
//                     const curr_row = rows[i].split(',');
//                     for (let j = 0; j < headers.length; j++) {
//                         obj[headers[j]] = curr_row[j];
//                     }
//                     data.push(obj);
//                 }
//                 print("data displayed")
//                 displayData(data);
//             });
//     }
// }

// // ===== CSV FILE UPLOAD =====

// function handleCSV(event) {
//     const file = event.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = function () {
//         const text = reader.result;
//         const data = parseCSV(text);
//         displayData(data);
//     };
//     reader.readAsText(file);
// }

// function parseCSV(text) {
//     const rows = text.trim().split('\n');
//     const headers = rows[0].split(',');
//     const data = [];
//     for (let i = 1; i < rows.length; i++) {
//         if (!rows[i].trim()) continue;
        
//         const obj = {};
//         const curr_row = rows[i].split(',');
//         for (let j = 0; j < headers.length; j++) {
//             obj[headers[j]] = curr_row[j];
//         }
//         data.push(obj);
//     }
//     return data;
// }
// let chartInstance = null;
// let chartInstance1 = null;
// // function graphing_chart(data){
// //     canvas.classList.remove('hidden');
// //     const labels = rows.map(row => Math.round(Number(row.timestamp) / 1000));
// //     const values = rows.map(row => row.angle_deg);
// //     if (!chart) {
// //         chart = new Chart(canvas.getContext('2d'), {
// //             type: 'line',
// //             data: {
// //                 labels,
// //                 datasets: [{
// //                     label: 'Posture angle (deg)',
// //                     data: values,
// //                     borderColor: '#7cc7ff',
// //                     backgroundColor: 'rgba(124, 199, 255, 0.18)',
// //                     borderWidth: 2,
// //                     fill: true,
// //                     tension: 0.2,
// //                     pointRadius: 0
// //                 }]
// //             },
// //             options: {
// //                 responsive: true,
// //                 maintainAspectRatio: true,
// //                 plugins: { legend: { labels: { color: '#e6edf3' } } },
// //                 scales: {
// //                     x: { ticks: { color: '#9da7b3' }, grid: { color: 'rgba(255,255,255,0.08)' } },
// //                     y: { ticks: { color: '#9da7b3' }, grid: { color: 'rgba(255,255,255,0.08)' } }
// //                 }
// //             }
// //         });
// //     } else {
// //         chart.data.labels = labels;
// //         chart.data.datasets[0].data = values;
// //         chart.update('none');
// //     }
// // }
// // function tablechart2(data) {
// //     const canvas = document.getElementById("postureChart2");
// //     canvas.style.display = "block";

// //     const labels = data.map(row => row["timestamp"] || "");
// //     const angleDeg = data.map(row => parseFloat(row["imu_upper_pitch_deg"]) || 0);

// //     if (chartInstance1) chartInstance1.destroy();

// //     chartInstance1 = new Chart(canvas, {
// //         type: "line",
// //         data: {
// //             labels: labels,
// //             datasets: [
// //                 { label: "Posture Angle (°)", data: angleDeg, borderColor: "#7cc7ff", backgroundColor: "rgba(124,199,255,0.18)", tension: 0.2, fill: true, pointRadius: 0, borderWidth: 2 }
// //             ]
// //         },
// //         options: {
// //             responsive: true,
// //             plugins: { legend: { position: "top" } },
// //             scales: {
// //                 x: { title: { display: true, text: "Timestamp" } },
// //                 y: { title: { display: true, text: "Degrees" } }
// //             }
// //         }
// //     });
// // }
// function tablechart2(data) {
//     const canvas = document.getElementById("postureChart2");
//     canvas.style.display = "block";

//     const labels = data.map(row => row["timestamp"] || "");
//     const upperRoll  = data.map(row => parseFloat(row["imu_upper_roll_deg"])  || 0);
//     const lowerRoll  = data.map(row => parseFloat(row["imu_lower_roll_deg"])  || 0);
//     const upperPitch = data.map(row => parseFloat(row["imu_upper_pitch_deg"]) || 0);
//     const lowerPitch = data.map(row => parseFloat(row["imu_lower_pitch_deg"]) || 0);

//     if (chartInstance1) chartInstance1.destroy();

//     chartInstance1 = new Chart(canvas, {
//         type: "line",
//         data: {
//             labels: labels,
//             datasets: [
//                 { label: "Upper Roll (°)",  data: upperRoll,  borderColor: "#3fb950", backgroundColor: "rgba(63,185,80,0.1)",  tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
//                 { label: "Lower Roll (°)",  data: lowerRoll,  borderColor: "#fbf6c8", backgroundColor: "rgba(251,246,200,0.1)", tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
//                 { label: "Upper Pitch (°)", data: upperPitch, borderColor: "#7cc7ff", backgroundColor: "rgba(124,199,255,0.1)", tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 },
//                 { label: "Lower Pitch (°)", data: lowerPitch, borderColor: "#f0a830", backgroundColor: "rgba(240,168,48,0.1)",  tension: 0.3, fill: false, pointRadius: 0, borderWidth: 2 }
//             ]
//         },
//         options: {
//             responsive: true,
//             plugins: { legend: { position: "top" } },
//             scales: {
//                 x: { title: { display: true, text: "Timestamp" } },
//                 y: { title: { display: true, text: "Degrees" } }
//             }
//         }
//     });
// }

// function tablechart(data) {
//     const canvas = document.getElementById("postureChart");
//     canvas.style.display = "block";

//     const labels = data.map(row => row["timestamp"] || "");
//     const upperRoll = data.map(row => parseFloat(row["imu_upper_roll_deg"]) || 0);
//     const lowerRoll = data.map(row => parseFloat(row["imu_lower_roll_deg"]) || 0);

//     if (chartInstance) chartInstance.destroy(); // uncommented!

//     chartInstance = new Chart(canvas, {
//         type: "line",
//         data: {
//             labels: labels,
//             datasets: [
//                 { label: "Upper Roll (deg)", data: upperRoll, borderColor: "#4f8ef7", tension: 0.3, fill: false },
//                 { label: "Lower Roll (deg)", data: lowerRoll, borderColor: "#f76f4f", tension: 0.3, fill: false }
//             ]
//         },
//         options: {
//             responsive: true,
//             plugins: { legend: { position: "top" } },
//             scales: {
//                 x: { title: { display: true, text: "Timestamp" } },
//                 y: { title: { display: true, text: "Degrees" } }
//             }
//         }
//     });
// }
// // ===== DISPLAY TABLE =====

// function displayData(data) {
//     const output = document.getElementById("output");

//     if (!data || data.length === 0) {
//         output.innerHTML = '<div class="empty-state"><p>📡 No data rows found. Check your CSV or device connection.</p></div>';
//         return;
//     }

//     const headers = Object.keys(data[0]);
//     let table = "<table><tr>";
//     headers.forEach(h => table += `<th>${h}</th>`);
//     table += "</tr>";

//     data.forEach(row => {
//         table += "<tr>";
//         headers.forEach(h => table += `<td>${row[h] !== undefined ? row[h] : ''}</td>`);
//         table += "</tr>";
//     });

//     table += "</table>";
//     output.innerHTML = table;
//     tablechart(data);
//     tablechart2(data);
//    // graphing_chart(data)
// }
// function destroyChart() {
//     if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
//     if (chartInstance2) { chartInstance2.destroy(); chartInstance2 = null; }
//     document.getElementById('postureChart').style.display = 'none';
//     document.getElementById('postureChart2').style.display = 'none';
// }
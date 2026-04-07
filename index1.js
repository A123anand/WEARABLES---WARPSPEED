const hardcodedCSV =
    'timestamp,imu_upper_roll_deg,imu_upper_pitch_deg,imu_upper_yaw_deg,imu_lower_roll_deg,imu_lower_pitch_deg,imu_lower_yaw_deg';

// ===== AUTH =====

function signUp() {
    const username = document.getElementById("newUsername");
    const password = document.getElementById("newPassword");
    if (username.value === "" || password.value === "") {
        alert("Please fill in both fields.");
        return;
    }
    if (localStorage.getItem(username.value)) {
        alert("Username already exists. Please choose a different username.");
        return;
    }
    localStorage.setItem(username.value, password.value);
    alert("Username \"" + username.value + "\" registered successfully!");
    switchTab('login');
}

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

    // ---- Successful login: transition to home screen ----
    const authScreen = document.getElementById("authScreen");
    const homeScreen = document.getElementById("homeScreen");

    // Show welcome message with username
    document.getElementById("welcomeMsg").textContent = "Welcome, " + username.value + "!";

    // Fade auth out, then show home
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

    // Fade home out
    homeScreen.classList.remove("visible");
    setTimeout(() => {
        homeScreen.style.display = "none";

        // Reset auth screen
        authScreen.classList.remove("fade-out");
        authScreen.style.display = "block";

        // Clear input fields
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";

        // Clear data output
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
        // Try to fetch live data from Flask server
        fetch('http://127.0.0.1:5000/data')
            .then(response => response.json())
            .then(data => displayData(data))
            .catch(error => {
                console.error('Could not connect to server:', error);
                // Fall back to parsing the hardcoded CSV header (no rows yet)
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
        const text = reader.result;
        const data = parseCSV(text);
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
let chartInstance = null;
// function graphing_chart(data){
//     const canvas = document.getElementById("Posture Graph")
//     canvas.style.display = "block";

//     const labels = data.map(row => row["timestamp"]);
//     const upperRoll = data.map(row => parseFloat(row["imu_upper_roll_deg"]) || 0);
//     const lowerRoll = data.map(row => parseFloat(row["imu_lower_roll_deg"]) || 0);
//     chartInstance = new Chart(canvas, {
//         type: "line",
//         data: {
//             labels: labels,
//             datasets: [
//                 { label: "Upper Roll", data: upperRoll, borderColor: "#4f8ef7", tension: 0.3, fill: false },
//                 { label: "Lower Roll", data: lowerRoll, borderColor: "#f76f4f", tension: 0.3, fill: false }
//             ]
//         },
//         options: {
//             responsive: true,
//             scales: {
//                 x: { title: { display: true, text: "Time" } },
//                 y: { title: { display: true, text: "Degrees" } }
//             }
//         }
//     });
// }
function tablechart(data) {
    const canvas = document.getElementById("postureChart");
    canvas.style.display = "block";

    const labels = data.map(row => row["timestamp"] || "");
    const upperRoll = data.map(row => parseFloat(row["imu_upper_roll_deg"]) || 0);
    const lowerRoll = data.map(row => parseFloat(row["imu_lower_roll_deg"]) || 0);

    if (chartInstance) chartInstance.destroy(); // uncommented!

    chartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                { label: "Upper Roll (deg)", data: upperRoll, borderColor: "#4f8ef7", tension: 0.3, fill: false },
                { label: "Lower Roll (deg)", data: lowerRoll, borderColor: "#f76f4f", tension: 0.3, fill: false }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { title: { display: true, text: "Timestamp" } },
                y: { title: { display: true, text: "Degrees" } }
            }
        }
    });
}
// ===== DISPLAY TABLE =====

function displayData(data) {
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
    tablechart(data);
   // graphing_chart(data)
}
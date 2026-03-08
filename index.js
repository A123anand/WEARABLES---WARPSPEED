
const hardcodedCSV = 
    'timestamp,imu_upper_roll_deg,imu_upper_pitch_deg,imu_upper_yaw_deg,imu_lower_roll_deg,imu_lower_pitch_deg,imu_lower_yaw_deg';

//Login 

function signUp(){
    const username = document.getElementById("newUsername");
    const password = document.getElementById("newPassword");
    if (username.value === "" || password.value === "") {
        alert("Please fill in both fields.");
        return;
    }
    if(localStorage.getItem(username)){
        alert("Username already exists. Please choose a different username.");
        return;
    }
    localStorage.setItem(username.value, password.value);
    alert("This username:  " + username.value + " has been registered successfully!");
    switchTab('login');
}
function logIn(){
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const stored = localStorage.getItem(username.value);
    if (stored === null) {
        alert("Username not found. Please sign up first.");
        return;
    }
    if (stored === password.value) {
        alert("Welcome back, " + username.value + "!");
        a = true;
        load_data(a);
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("signupForm").style.display = "none";
        document.getElementById("loginTab").style.display = "none";
        document.getElementById("signupTab").style.display = "none";



    } else {

        alert("Incorrect password. Please try again.");
    }   
}
function load_data(a){
    if (a === true) {
        async function load_data() {
            try {
                const response = await fetch('http://127.0.0.1:5000/data');
                const data = await response.json();
                displayData(data);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('Could not connect to server.');
            }
        }
        const rows = hardcodedCSV.split('\n');
        const headers = rows[0].split(',');
        console.log(headers);
        const data = [];
        for(let i=1; i < rows.length; i++){
            const obj = {};
            const curr_row = rows[i].split(',');
            for(let j=0; j < headers.length; j++){
                obj[headers[j]] = curr_row[j];
            }
        
        data.push(obj); //  a server or system actively sends data to a client or receiver 
    }}
    displayData(data);
    return data;
}
function displayData(data) {

    const output = document.getElementById("output");

    if (data.length === 0) {
        output.innerHTML = "<p>No data found.</p>";
        return;
    }

    // HTML table from the CSV data
    const headers = Object.keys(data[0]);
    let table = "<table border='1'><tr>";

    headers.forEach(h => table += `<th>${h}</th>`);
    table += "</tr>";

    data.forEach(row => {
        table += "<tr>";
        headers.forEach(h => table += `<td>${row[h]}</td>`);
        table += "</tr>";
    });

    table += "</table>";
    output.innerHTML = table;
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




















// file reader to read csv file values incase network stuff doesnt work
// input.addEventListener('change', function() {
//     const file = input.files[0];
//     const reader = new FileReader();

//     reader.onload = function() {
//         const text = reader.result;
//         console.log(text);
//         parse(text);  // pass text in here
//     };

//     reader.readAsText(file);
// });

// function parse(text) {        //  text is the parameter
//     const rows = text.split('\n');
//     const headers = rows[0].split(',');
//     console.log(headers);

//     const data = [];

//     for (let i = 1; i < rows.length; i++) {
//         const obj = {};
//         const curr_row = rows[i].split(',');
//         for (let j = 0; j < headers.length; j++) {
//             obj[headers[j]] = curr_row[j];
//         }
//         data.push(obj);
//     }

//     console.log(data);  // check the full parsed result
// }

// function Button() {
//     alert("Button Clicked");
//     parse();  // call the parse function when the button is clicked
// }
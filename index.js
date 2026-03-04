const input = document.getElementById('csvInput');

input.addEventListener('change', function() {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function() {
        const text = reader.result;
        console.log(text);
        parse(text);  // pass text in here
    };

    reader.readAsText(file);
});

function parse(text) {        //  text is the parameter
    const rows = text.split('\n');
    const headers = rows[0].split(',');
    console.log(headers);

    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const obj = {};
        const curr_row = rows[i].split(',');
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = curr_row[j];
        }
        data.push(obj);
    }

    console.log(data);  // check the full parsed result
}

function Button() {
    alert("Button Clicked");
    parse();  // call the parse function when the button is clicked
}
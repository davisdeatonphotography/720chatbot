document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Redirect the user to the main page
            window.location.href = '/index.html';
        } else {
            // Display an error message
            alert(data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

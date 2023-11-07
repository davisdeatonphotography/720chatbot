window.onload = function() {
    // Authenticate first
    fetch('/login', {
        // login logic  
    })
    .then(() => {
        // Now fetch chats
        fetch('/getChats')
        .then(response => response.json())
        .then(chats => {
            const chatHistoryDiv = document.getElementById('chatHistory');
            chats.forEach(chat => {
                const chatDiv = document.createElement('div');
                chatDiv.textContent = `Chat ID: ${chat.chatId}, Start Time: ${new Date(chat.startTime).toLocaleString()}`;
                chatDiv.onclick = function() {
                    // store the chatId in local storage to use it when the user goes to the chat page
                    localStorage.setItem('chatId', chat.chatId);
                    // redirect the user to the chat page
                    window.location.href = '/index.html'; // replace '/chat.html' with the actual path to your chat page
                };
                chatHistoryDiv.appendChild(chatDiv);
            });
        });
    });
};

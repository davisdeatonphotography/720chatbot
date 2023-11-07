$(document).ready(function() {
    let chatId = localStorage.getItem('chatId');
    let messages = [];
    let totalTokens = 0;
    let remainingTokens = 16000;
    const tokenRatio = 0.25;

    // Event Listeners
    $('.close-button').on('click', closeModal);
    $('#api-key-field').on('input', storeApiKey);
    $('#save-key').on('click', saveApiKey);
    $('#input-field').on('input', handleInputFieldChange);
    $('#send-button').on('click', sendMessage);
    $('.new-chat-button').on('click', startNewChat);

    if (chatId) {
        loadChatHistory(chatId);
    }

    console.log("Document is ready.");

    function closeModal() {
        $('#chatHistoryModal').removeClass('active');
    }

    function loadChatHistory(chatId) {
        fetch(`/getChatHistory/${chatId}`)
            .then(response => response.json())
            .then(chat => {
                chat.messages.forEach(message => {
                    displayMessage(message.role, message.content);
                });
                localStorage.removeItem('chatId');
            })
            .catch(error => {
                console.error('Error while loading chat history:', error);
            });
    }

    function storeApiKey() {
        localStorage.setItem('openaiKey', $(this).val());
        console.log("API key field input detected and stored in local storage.");
    }

    function saveApiKey() {
        const apiKey = $('#api-key-field').val();
        localStorage.setItem('openaiKey', apiKey);
        console.log("API key saved into local storage.");
    }

    function getApiKey() {
        let apiKey = localStorage.getItem('openaiKey');
        console.log("Retrieved API key from local storage:", apiKey);
        return apiKey;
    }

    function updateTokenCounts() {
        const currentMessageSize = $('#input-field').val().length;
        const currentTokenCount = Math.ceil(currentMessageSize * tokenRatio);
        $('#current-token-count').text(currentTokenCount);
        $('#remaining-token-count').text(remainingTokens - totalTokens);
        $('#char-counter').text(`${currentMessageSize} characters`);
        console.log("Token counts updated.");
    }

    function handleInputFieldChange() {
        updateTokenCounts();
        $('#input-field').attr('rows', $(this).val().split('\n').length || 1);
        console.log("Input field updated.");
    }

    function displayMessage(role, content) {
        console.log(`Displaying message with role: ${role}, content: "${content}"`);

        const $messageDiv = $(`<div class="chat-message ${role}"></div>`);
        $messageDiv.html(content);
        if (role === 'user') {
            appendCopyIcon($messageDiv, content);
        }
        $('#chat-messages').append($messageDiv);
        $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
    }
    function appendCopyIcon($element, content) {
        $element.append('<i class="fas fa-copy copy-icon"></i>');
        $element.find('.copy-icon').on('click', function(e) {
            e.preventDefault();
            copyContentToClipboard(content);
        });
    }

    function copyContentToClipboard(content) {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = content;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        console.log("User message copied to clipboard.");
    }

    function sendMessage() {
        const userMessage = $('#input-field').val();
        if (userMessage.trim() !== '') {
            processUserMessage(userMessage);
        }
    }

    function processUserMessage(userMessage) {
        const userTokens = Math.ceil(userMessage.length * tokenRatio);
        $('#input-field').val('');
        messages.push({
            role: 'user',
            content: userMessage
        });
        displayMessage('user', userMessage);
        totalTokens += userTokens;

        console.log("Send button clicked. Message sent by user:", userMessage);

        if (!chatId) {
            startChat(userMessage);
        } else {
            updateChat([userMessage]);
        }
        sendMessageToAssistant(userMessage);
    }

    function startChat() {
        $.post('/start-chat', (data) => {
            // save chatId
            if (data.success && data.chatId) {
                chatId = data.chatId;
                console.log("Chat started. Chat ID:", chatId);
            } else {
                console.error('Error starting chat. Server response:', data);
            }
        }).fail(() => {
            console.error('Error starting chat');
        });
    }

    function updateChat(messages) {
        if (!chatId) {
            console.error('Cannot update chat because chatId is undefined');
            return;
        }
    
        console.log('Sending POST request to /updateChat with data:', JSON.stringify({ chatId, messages }));
    
        $.post('/updateChat', {
            chatId,
            messages
        }).fail((error) => {
            console.error('Error in POST request to /updateChat:', error);
        });
    }

    function sendMessageToAssistant(userMessage) {
        if (totalTokens <= remainingTokens) {
            sendRequestToOpenAI(userMessage);
        } else {
            displayMessage('assistant', 'I\'ve reached my maximum token limit for this conversation.');
            console.log('Assistant reached maximum token limit for conversation.');
        }
    }

    function sendRequestToOpenAI(userMessage) {
        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                model: $('#model-selection').val(),
                messages: messages,
                max_tokens: Math.floor(remainingTokens - totalTokens),
                temperature: 0.7
            })
        }).then(response => {
            console.log("Response received from OpenAI API:", response);
            return response.json();
        }).then(handleOpenAIResponse)
          .catch(handleOpenAIError);
    }

    function handleOpenAIResponse(data) {
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            const assistantReply = data.choices[0].message.content;
            messages.push({
                role: 'assistant',
                content: assistantReply
            });
            totalTokens += Math.ceil(assistantReply.length * tokenRatio);
            $('#total-token-count').text(totalTokens);
            displayMessage('assistant', assistantReply);
            updateChat([assistantReply]);
        } else {
            displayMessage('assistant', 'Hmm, I\'m having trouble coming up with a response.');
            console.log('Assistant had trouble generating a response.');
        }
    }

    function handleOpenAIError(error) {
        console.error('Error while sending message to assistant:', error);
        displayMessage('assistant', 'Oops, something went wrong.');
    }

    function startNewChat() {
        messages = [];
        totalTokens = 0;
        remainingTokens = 16000;
        $('#chat-messages').empty();
        $('#total-token-count').text(totalTokens);
        $('#remaining-token-count').text(remainingTokens);
        displayMessage('assistant', 'Hello! I\'m My-Robot, an AI assistant to answer your questions. How can I help you today?');
        console.log('Started a new chat.');
    }
});

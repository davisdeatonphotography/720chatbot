Here is a draft readme.md for the chatbot code:

# My Chatbot

This is a chatbot web application built with Node.js, Express, and MongoDB. It allows users to have conversations with an AI assistant powered by the OpenAI API.

## Features

- Chat interface for conversing with an AI assistant
- Saves chat history to a MongoDB database
- Authentication system for users to log in
- View past chat history 
- Copy user messages
- Character counter for user input
- Token usage tracking
- Multiple OpenAI models to choose from

## Usage

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file with your MongoDB URI and OpenAI API key
4. Start the server with `npm start`
5. Navigate to `http://localhost:3000`

The chatbot UI will load, allowing you to log in or start a new chat. You can customize the OpenAI model and view usage statistics. User and assistant messages will be displayed in real-time as you chat.

## Code Overview

The `server.js` file initializes the Express server and Mongo database connection. API routes are defined for starting chats, sending messages, and retrieving chat history.

React components in `App.js` make up the chat UI and handle all front-end logic. The `Chat` component displays the chat window with messages, input field, and buttons. The `Message` component renders individual messages. 

User messages are sent to the OpenAI API to generate assistant responses. The chat history is saved to MongoDB after each message.

## Development Roadmap

Planned future features:

- User accounts 
- Private/group chats
- Customizable assistant name and avatar
- More OpenAI models
- Automated tests
- Deployment to production server

## License

This project is open source and available under the [MIT License](LICENSE).
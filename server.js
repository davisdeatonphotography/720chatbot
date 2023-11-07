const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '.')));

const uri = "mongodb+srv://davisaitools:1234@my-chatbot-history.c4ynrkm.mongodb.net/?retryWrites=true&w=majority";
const secretKey = 'mysecretkey'; // Replace this with your own secret key

let client;
let collection;

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Chat schema
const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chatId: String,
    messages: [String],
    startTime: Date,
});

const Chat = mongoose.model('Chat', chatSchema);

async function main() {
    try {
        console.log('Attempting to connect to database...');
        client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Successfully connected to the database');
        const port = process.env.PORT || 3000;
        app.listen(port, () => console.log(`Server is listening on port ${port}...`));
    } catch (err) {
        console.error('Failed to connect to the database', err);
        process.exit(1);
    }
}

main().catch(console.error);

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Error during password hashing' });
        } else {
            const user = new User({ username, password: hash });
            user.save()
                .then(() => res.json({ success: true }))
                .catch(err => res.status(500).json({ success: false, message: err.message }));
        }
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    User.findOne({ username })
        .then(user => {
            if (!user) {
                res.status(401).json({ success: false, message: 'Invalid username or password' });
            } else {
                bcrypt.compare(password, user.password, (err, result) => {
                    if (err || !result) {
                        res.status(401).json({ success: false, message: 'Invalid username or password' });
                    } else {
                        const token = jwt.sign({ username: user.username }, secretKey);
                        res.cookie('token', token).json({ success: true });
                    }
                });
            }
        })
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
    } else {
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                res.status(401).json({ success: false, message: 'Not authenticated' });
            } else {
                req.username = decoded.username;
                next();
            }
        });
    }
};

app.get('/', authenticate, (req, res) => {
    console.log('Received a GET request at "/"');
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/start-chat', authenticate, (req, res) => {
    User.findOne({username: req.username})
      .then(user => {
        if (!user) {
            res.status(500).json({ success: false, message: 'Error finding user' });
        } else {
            // create chat
            const chat = new Chat({ userId: user._id, chatId: uuidv4(), messages: [], startTime: new Date() });
            chat.save()
                .then(() => res.json({ success: true, chatId: chat.chatId }))
                .catch(err => res.status(500).json({ success: false,message: err.message }));
        }
    }).catch(err => {
        console.error('Error in User.findOne:', err.message);
        res.status(500).json({ success: false, message: err.message });
    });
});

app.use((req, res, next) => {
    console.log(`Received ${req.method} request at ${req.path} from ${req.ip}`);
    next();
});

app.post('/updateChat', authenticate, (req, res) => {
    console.log(`Processing POST request to /updateChat from user: ${req.username}`);
    const { chatId, messages } = req.body;

    User.findOne({ username: req.username }).then(user => {
        if (!user) {
            console.error('Error finding user:', req.username);
            res.status(500).json({ success: false, message: 'Error finding user' });
        } else {
            Chat.findOneAndUpdate({ chatId: chatId, userId: user._id }, { $push: { messages: { $each: messages } } }).then(chat => {
                if (!chat) {
                    console.error('Chat not found with ID:', chatId);
                    res.status(404).json({ success: false, message: 'Chat not found' });
                } else {
                    console.log('Chat updated successfully');
                    res.json({ success: true });
                }
            }).catch(err => {
                console.error('Error in Chat.findOneAndUpdate:', err.message);
                res.status(500).json({ success: false, message: err.message });
            });
        }
    }).catch(err => {
        console.error('Error in User.findOne:', err.message);
        res.status(500).json({ success: false, message: err.message });
    });
});

app.get('/getChats', authenticate, (req, res) => {
    User.findOne({ username: req.username }).then(user => {
        if (!user) {
            res.status(500).json({ success: false, message: 'Error finding user' });
        } else {
            Chat.find({ userId: user._id })
                .then(chats => res.json({ success: true, chats }))
                .catch(err => res.status(500).json({ success: false, message: err.message }));
        }
    }).catch(err => res.status(500).json({ success: false, message: err.message }));
});

app.get('/getChatHistory/:id', authenticate, (req, res) => {
    const chatId = req.params.id;
    User.findOne({ username: req.username }).then(user => {
        if (!user) {
            res.status(500).json({ success: false, message: 'Error finding user' });
        } else {
            Chat.findOne({ userId: user._id, chatId: chatId })
                .then(chat => {
                    if (!chat) {
                        res.status(404).json({ success: false, message: 'Chat not found' });
                    } else {
                        res.json({ success: true, messages: chat.messages });
                    }
                })
                .catch(err => res.status(500).json({ success: false, message: err.message }));
        }
    }).catch(err => res.status(500).json({ success: false, message: err.message }));
});

app.use((req, res) => {
    console.error('Route not found:', req.path);
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Uncaught error:', err.message);
    res.status(500).json({ success: false, message: 'Uncaught error' });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, closing database connection and exiting...');
    if (client) {
        client.close();
    }
    if (mongoose.connection) {
        mongoose.connection.close();
    }
    process.exit();
});
const mongo = require('mongodb').MongoClient;
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'LetsChat Bot';

// Connect to mongo
mongo.connect('mongodb+srv://Tania:Tania@cluster0.w1ecr.mongodb.net/db?retryWrites=true&w=majority/db', function(err, client){
    if(err){

        throw err;
    }

console.log('MongoDB connected...');
///var chatSchema = mongo.Schema({
//user:String,
  //msg:String,
 //room: String

//});
//var Chat = mongo.model('Messagess', chatSchema);


// Run when client connects
io.on('connection', socket => {
    //let chat = client.db.collection('chats');
    let chat = client.db('db');
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

     // Get chats from mongo collection
     chat.collection('chats').find({room: user.room}).limit(100).sort({_id:1}).toArray(function(err, res){
        if(err){
          throw err;
              }

        // Emit the messages to client

          //socket.to(user.room).emit('output', res); //res has user and msg
        socket.emit('output', res);
          console.log('database')
          console.log(res)
    });


    // Welcome current user
    console.log("Welcome message emitted from server");

    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });




  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
    chat.collection('chats').insert({user:user.username, msg:msg, room: user.room}); //inserting our username and message to db

  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});
});
  });


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

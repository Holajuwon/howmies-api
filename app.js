const express = require('express');

const app = express();
const server = express();

const UserSignup = require('./routes/UserSignup');
const UserLogin = require('./routes/UserLogin');
const PropertyHunt = require('./routes/PropertyHunt');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth/users', [UserSignup, UserLogin]);
app.use('', PropertyHunt);

server.use('/api/v1', app);

module.exports = server;

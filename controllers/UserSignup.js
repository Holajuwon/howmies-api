const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pool = require('../elephantsql');

dotenv.config();

const tokenKeys = {
  keyPrivate: process.env.RSA_PRIVATE_KEY,
  keyPublic: process.env.RSA_PUBLIC_KEY,
};

const salt = bcrypt.genSaltSync(10);

const expiresIn = '20 minutes';

exports.signup = (req, response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return response.status(422).send({ message: errors.array() }); }

  const {
    firstName,
    lastName,
    email,
    phone,
    password,
  } = req.body;

  const passwordCrypt = bcrypt.hashSync(password, salt);
  const token = jwt.sign({ email, passwordCrypt }, tokenKeys.keyPrivate, { expiresIn });
  const userRegDate = new Date();

  pool.query('INSERT INTO users(first_name, last_name, email, phone, password, register_date) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
    [firstName,
      lastName,
      email,
      phone,
      passwordCrypt,
      userRegDate.toUTCString(),
    ],
    (err, result) => {
      if (err) {
        return response.status(406).send({
          status: err.name,
          message: (err.message.includes('getaddrinfo', 0)) ? 'Internal Server Error' : 'Account already in use',
          data: {},
        });
      }

      response.status(200).set('Authorization', token).send({
        message: 'Successfully signed up',
        data: {
          userID: result.rows.find((e) => e.email === email).user_id,
          username: result.rows.find((e) => e.email === email).first_name,
        },
      });
    });
};

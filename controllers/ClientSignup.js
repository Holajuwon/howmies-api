const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pool = require('../elephantsql');

dotenv.config();

if (dotenv.config().error) throw dotenv.config().error;

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
    phoneNumber,
    password,
    confirmPassword,
  } = req.body;

  pool.query('SELECT email FROM real_estate_agents WHERE email=$1', [email], (err, result) => {
    if (err) {
      return response.status(500).send({
        status: response.statusCode,
        message: 'Internal Server error',
        data: {},
      });
    }

    if (result.rows.length !== 0) {
      response.status(406)
        .send({
          status: response.statusCode,
          message: 'Account exists as Real Estate Agent',
          data: {},
        });
    } else {
      const passwordCrypt = bcrypt.hashSync(password, salt);
      const token = jwt.sign({ email, passwordCrypt }, tokenKeys.keyPrivate, { expiresIn });
      const clientRegDate = new Date();

      pool.query('INSERT INTO clients(client_fname, client_lname, client_email, client_phone_number, client_password, date_became_client) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
        [firstName,
          lastName,
          email,
          phoneNumber,
          passwordCrypt,
          clientRegDate.toUTCString(),
        ],
        (err1, result1) => {
          if (err1) {
            return response.status(406).send({
              status: err1.name,
              message: (err1.stack.includes('duplicate', 0)) ? 'Account already in use' : 'Internal Server Error',
              data: {},
            });
          }

          response.set('Authorization', token).send({
            message: 'Successfully signed up',
            data: {
              token,
              clientID: result1.rows[0].client_id,
            },
          });
        });
    }
  });
};

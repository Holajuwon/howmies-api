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
    agentName,
    address,
    lga,
    state,
    email,
    officeNumber,
    mobileNumber,
    password,
    confirmPassword,
  } = req.body;

  pool.query('SELECT owner_email, client_email FROM property_owners, clients WHERE owner_email=$1 OR client_email=$1;', [email], (err, result) => {
    if (err) {
      return response.status(500).send({
        message: 'Internal Server error',
        data: {},
      });
    }

    if (result.rows.length !== 0) {
      response.status(406)
        .send({
          message: 'Account exists as Property Owner or Client',
          data: {},
        });
    } else {
      const passwordCrypt = bcrypt.hashSync(password, salt);
      const token = jwt.sign({ email, passwordCrypt }, tokenKeys.keyPrivate, { expiresIn });

      pool.query('INSERT INTO real_estate_agents(agent_name, address, lga, state, email, office_number, mobile_number, agent_password) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [agentName,
          address,
          lga,
          state,
          email,
          officeNumber,
          (mobileNumber && mobileNumber.length) ? mobileNumber : null,
          passwordCrypt],
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
              agentID: result1.rows[0].agent_id,
            },
          });
        });
    }
  });
};

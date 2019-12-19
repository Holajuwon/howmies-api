const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../elephantsql');

dotenv.config();

if (dotenv.config().error) throw dotenv.config().error;

const tokenKeys = {
  keyPrivate: process.env.RSA_PRIVATE_KEY,
  keyPublic: process.env.RSA_PUBLIC_KEY,
};

const salt = bcrypt.genSaltSync(10);

const expiresIn = '20 minutes';

exports.requestValidator = [
  body('agentName').trim(' ')
    .notEmpty()
    .withMessage('Input agency name')
    .escape(),
  body('address').trim(' ')
    .notEmpty()
    .withMessage('Input office address')
    .escape(),
  body('lga').trim(' ')
    .notEmpty()
    .withMessage('Input office local government area')
    .escape(),
  body('state').trim(' ')
    .notEmpty()
    .withMessage('Input the state your office is located')
    .escape(),
  body('email').trim(' ')
    .notEmpty()
    .withMessage('Input a user email')
    .isEmail()
    .withMessage('Input correct email address')
    .normalizeEmail({ all_lowercase: true }),
  body('officeNumber').trim(' ')
    .notEmpty()
    .withMessage('Input a phone number into the office number field')
    .isLength({ max: 14, min: 11 })
    .withMessage('Ensure you are inputting a standard phone number e.g. 08123456789 or +2348123456789')
    .escape(),
  body('mobileNumber').trim(' ')
    .notEmpty()
    .withMessage('Do not send empty data in the optional mobile number field')
    .isLength({ max: 14, min: 11 })
    .withMessage('Ensure you are inputting a standard phone number e.g. 08123456789 or +2348123456789')
    .escape()
    .optional({ nullable: true }),
  body('password').trim(' ')
    .notEmpty()
    .withMessage('Input a user password')
    .isLength({ max: 24, min: 8 })
    .withMessage('Password must be between 8 - 24 characters')
    .escape(),
];

exports.signup = (req, response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return response.status(422).send({ error: errors.array() }); }

  const {
    agentName,
    address,
    lga,
    state,
    email,
    officeNumber,
    mobileNumber,
    password,
  } = req.body;

  pool.query('SELECT owner_email, client_email FROM property_owners, clients WHERE owner_email=$1 OR client_email=$1;', [email], (err, result) => {
    if (err) {
      return response.status(500).send({
        status: response.statusCode,
        data: {
          warningMessage: 'Internal Server error',
        },
      });
    }

    if (result.rows.length !== 0) {
      response.status(400)
        .send({
          status: response.statusCode,
          data: { warningMessage: 'Account exists as Property Owner or Client' },
        });
    } else if (officeNumber.length !== 11 && officeNumber.length !== 14) {
      response.status(400)
        .send({
          status: response.statusCode,
          data: { warningMessage: 'Input a valid phone number into the main office number field' },
        });
    } else if (mobileNumber && mobileNumber.length !== 11 && mobileNumber.length !== 14) {
      response.status(400)
        .send({
          status: response.statusCode,
          data: { warningMessage: 'Input a valid phone number into the mobile phone number field' },
        });
    } else if (officeNumber === mobileNumber) {
      response.status(400)
        .send({
          status: response.statusCode,
          data: { warningMessage: 'mobile number must not be the same as office number' },
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
              data: {
                warningMessage: (err1.stack.includes('duplicate', 0)) ? 'Account already in use' : 'Internal Server Error',
              },
            });
          }

          response.set('Authorization', token).send({
            token,
            agentID: result1.rows[0].agent_id,
          });
        });
    }
  });
};

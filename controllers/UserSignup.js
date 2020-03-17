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

module.exports = async (req, response) => {
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

  const user = await pool.query(
    `INSERT INTO users(first_name, last_name, email, phone, password, register_date)
    VALUES($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [firstName,
      lastName,
      email,
      phone,
      passwordCrypt,
      Date.now(),
    ],
  )
    .then((result) => {
      if (result.rows
        && result.rows.length > 0
        && bcrypt.compareSync(password, result.rows.find((e) => e.email === email).password)) {
        return {
          data: {
            uid: result.rows[0].user_id,
            name: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
            telephone: result.rows[0].phone,
            emailAddress: result.rows[0].email,
          },
        };
      }
    })
    .catch((err) => ({
      error: (
        err.message.includes('getaddrinfo', 0)
      ) ? 'Internal Server Error' : 'Account already in use',
    }));

  if ((user && user.error) || !user) {
    return response.status(500).send({
      status: 'Error',
      message: user.error,
    });
  }

  const {
    uid, name, telephone, emailAddress,
  } = user.data;

  // sign token
  const expiresIn = 1500;
  const exp = Math.floor((Date.now() / 1000) + (60 * 60 * 24 * 30));
  const aud = 'user';
  const iss = 'Howmies Entreprise';
  const data = 'refresh user';
  const algorithm = 'HS256';

  const accessToken = jwt.sign(
    {
      iss, aud, uid,
    },
    tokenKeys.keyPrivate,
    { expiresIn, algorithm },
  );
  const refreshToken = jwt.sign(
    { exp, data },
    tokenKeys.keyPrivate,
    { algorithm, issuer: iss, audience: aud },
  );

  const loggedUser = await pool.query(
    'INSERT INTO logged_users(user_id, refresh_token) VALUES($1, $2)',
    [uid, refreshToken],
  )
    .then(() => null)
    .catch((err) => {
      if (!err) {
        return { error: 'Internal Server Error' };
      }
    });

  if (loggedUser && loggedUser.error) {
    return response.status(406).send({
      status: 'Error',
      message: loggedUser.error,
    });
  }

  response.status(200).set({
    Authorization: accessToken,
    RefreshToken: refreshToken,
  }).send({
    message: 'Successfully signed up',
    data: {
      uid,
      name,
      telephone,
      emailAddress,
      expiresIn: `${expiresIn}s`,
      refreshIn: `${exp}s`,
    },
  });
};

const { body, header } = require('express-validator');

exports.postPropertyValidator = [
  header('Authorization')
    .trim(' ')
    .notEmpty()
    .withMessage('Invalid access')
    .isLength({ max: 16 })
    .withMessage('Too long')
    .escape(),
  body('type')
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isLength({ max: 16 })
    .withMessage('Too long')
    .escape(),
  body('address')
    .trim(' ')
    .notEmpty()
    .withMessage('Input your first name')
    .isLength({ max: 32 })
    .withMessage('Too long')
    .escape(),
  body('lga')
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isLength({ max: 16 })
    .withMessage('Too long')
    .escape(),
  body('state')
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isLength({ max: 16 })
    .withMessage('Too long')
    .escape(),
  body('price')
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isInt({ min: 0 })
    .withMessage('Too long')
    .isLength({ max: 8 })
    .withMessage('Too long')
    .escape(),
  body('period')
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isLength({ max: 12 })
    .withMessage('Too long')
    .escape(),
  body('description')
    .optional()
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isLength({ max: 128 })
    .withMessage('Too long')
    .escape(),
  body('features')
    .optional()
    .trim(' ')
    .notEmpty()
    .withMessage('Input your last name')
    .isLength({ max: 16 })
    .withMessage('Too long')
    .escape(),
];

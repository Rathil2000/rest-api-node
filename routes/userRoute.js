const express = require('express');
const router = express.Router();
// const { signUpValidation, forgetValidation} = require('../helpers/validation')

const userController = require('../controller/userController')
router.post('/register',userController.register)
router.post('/forget-password', userController.forgetPassword)
module.exports = router;
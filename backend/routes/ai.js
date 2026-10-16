const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuthenticate } = require('../middleware/auth');

router.post('/chat', optionalAuthenticate, aiController.handleChat);

module.exports = router;

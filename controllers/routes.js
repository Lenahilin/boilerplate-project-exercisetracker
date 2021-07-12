var express = require('express');
const path = require('path');

const { createUser, findUser } = require('../models/user');
const { saveExercise } = require('../models/exercise');
const { getDate, getUser, getAllUsers, getFullLog, getPartialLog, formatPayload, createExercise } = require('./logic');

var router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.resolve(process.env.ROOT_DIR + 'views/index.html'));
});

router.post('/api/new-user', (req, res) => {
  createUser(req.body.username, (err, data) => {
    if (err) return res.status(500).send('cannot create user');
    return res.json({username: data.username, _id: data._id}).send();
  });
})

/* get all users */
router.get('/api/users', (req, res) => {
  getAllUsers()
    .then((users) => {
      var result = users.map((u) => { return {username: u.username, _id: u._id}});
      res.send(result);
    })
    .catch((err) => console.error(err));
});

/* add an exercise
   You can POST to /api/exercise/add with form data userId, description, duration, and optionally date.
   If no date is supplied, the current date will be used.
   The response returned will be the user object with the exercise fields added. */
//TODO: rewrite with promises
router.post('/api/exercise/add', (req, res) => {

  if (!req.body.userId || !req.body.description || !req.body.duration) res.send('some of required data are missing');
  if (!req.body.date) req.body.date = getDate();

  // findUser(req.body.userId, (err, data) => { 
  //   if (err) res.send('error while connecting the db');
  //   if (data == null) return res.status(400).send('no such user');
  //   var user = data;
  //   saveExercise(user, req.body, (err, data) => { // TODO: don't pass the user object, user._id is already present in req.body
  //     if (err) res.send('could not save the exercise');
  //     var e = data;
  //     res.send({_id: user._id, username: user.username, exercise: {description: e.description, duration: e.duration, date: e.date}}); // TODO: better date formatting
  //   });
  // });

  var payload = {exercise: {}};
  getUser(req.body.userId)
    .then((user) => {
      payload._id = user._id;
      payload.username = user.username;
      return createExercise(req.body);
    })
    .then((exercise) => {
      payload.exercise.description = exercise.description;
      payload.exercise.duration = exercise.duration;
      payload.exercise.date = exercise.date;
      res.send(payload);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('sorry, something went wrong');
    })
});

/* get a whole or a partial exercise log for a user
   You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user. 
   The returned response will be the user object with a log array of all the exercises added. 
   Each log item has the description, duration, and date properties.
   You can add from, to and limit parameters to a /api/users/:_id/logs request to retrieve part of the log of any user. 
   'from' and 'to' are dates in yyyy-mm-dd format, limit is an integer of how many logs to send back. */
router.get('/api/users/:_id/logs', (req, res) => {
  //TODO: from/to params validation

  /* input validation */
  var limit = Number(req.query.limit);
  if (req.query.limit != undefined && (!Number.isInteger(limit) || limit <= 0)) {
    return res.status(400).send('bad request, limit must be a positive integer');
  }

  var data = {};
  getUser(req.params._id)
    .then((user) => { 
      data.user = user;
      if (req.query.limit != undefined) return getPartialLog(user, req.query.from, req.query.to, limit);
      else return getFullLog(user);
    })
    .then((exercises) => {
      data.exercises = exercises;
      res.send(formatPayload(data));
    })
    .catch((err) => console.error(err));
});

module.exports = router;
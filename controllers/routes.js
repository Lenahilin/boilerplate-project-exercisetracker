var express = require('express');
const path = require('path');

const {createUser, findUser, getAllUsers} = require ('../models/user');

var router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.resolve(process.env.ROOT_DIR + 'views/index.html'));
});

router.post('/api/new-user', (req, res) => {
  createUser(req.body.username, (err, data) => {
    if (err) return res.json('oops something went wrong').send;
    return res.json({username: data.username, _id: data._id}).send();
  });
})

/* get all users */
router.get('/api/users', (req, res) => {
  getAllUsers({}, (err, data) => {
    if (err) return res.json('cannot get users').send();
    // TODO: implement via cursor for better performance 
    var result = data.map((record) => { return {username: record.username, _id: record._id}});
    res.send(result);
  })
});

/* add an exercise
   You can POST to /api/exercise/add with form data userId, description, duration, and optionally date.
   If no date is supplied, the current date will be used.
   The response returned will be the user object with the exercise fields added. */
router.post('/api/exercise/add', (req, res) => { // /api/users/:_id/exercises

  if (!req.body.userId || !req.body.description || !req.body.duration) res.send('some of required data are missing');
  if (!req.body.date) req.body.date = getDate();

  findUser(req.body.userId, (err, data) => { 
    if (err) res.send('error while connecting the db');
    if (data == null) return res.status(400).send('no such user');
    var user = data;
    createExercise(user, req.body, (err, data) => { // TODO: don't pass the user object, user._id is already present in req.body
      if (err) res.send('could not save the exercise');
      var e = data;
      res.send({_id: user._id, username: user.username, exercise: {description: e.description, duration: e.duration, date: e.date}}); // TODO: better date formatting
    });
  });
});

/* get a whole or a partial exercise log for a user
   You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user. 
   The returned response will be the user object with a log array of all the exercises added. 
   Each log item has the description, duration, and date properties.
   You can add from, to and limit parameters to a /api/users/:_id/logs request to retrieve part of the log of any user. 
   'from' and 'to' are dates in yyyy-mm-dd format, limit is an integer of how many logs to send back. */
router.get('/api/users/:_id/logs', (req, res) => {
  //TODO: paginations params validation

  function getPartialLog(user, from, to, limit) {
    return new Promise((resolve, reject) => {
      getExercises(user, from, to, limit, (err, data) => {
        if (err) reject (new Error('could not fetch partial exercise logs'));
        else resolve(data);
      })
    })
  }

  /* input validation */
  if (req.query.limit != undefined && (req.query.limit <= 0 || !req.query.limit.isInteger())) {
    return res.status(400).send('bad request, limit must be a positive integer');
  }

  var data = {};
  getUser(req.params._id)
    .then((user) => { 
      data.user = user;
      if (req.query.limit != undefined) {
        var limit = parseInt(req.query.limit);
        return getPartialLog(user, req.query.from, req.query.to, limit);
      } else return getFullLog(user);
    })
    .then((exercises) => {
      data.exercises = exercises;
      res.send(formatPayload(data));
    })
    .catch((err) => console.error(err));
});

module.exports = router;
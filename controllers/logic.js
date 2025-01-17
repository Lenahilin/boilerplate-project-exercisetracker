const { findUser, findManyUsers } = require('../models/user');
const { saveExercise, getAllExercises, getExercises } = require('../models/exercise');

function getDate() { // yyyy-mm-dd
  let date = new Date();
  let y = date.getFullYear().toString();
  let m = date.getMonth() + 1;
  if (m < 10) m = '0' + m.toString();
  let d = date.getDate().toString();
  return y + '-' + m + '-' + d;
}

function getUser(id) {
  return new Promise( (resolve, reject) => {
    findUser(id, (err, user) => {
      if (err) reject(new Error('cannot find the user'));
      else resolve(user);
    });
  });
}

function getAllUsers() {
  return new Promise( (resolve, reject) => {
    findManyUsers({}, (err, users) => {
      if (err) reject(new(Error('cannot get users')));
      else resolve(users);
    })
  })
}

function getFullLog(user) {
  return new Promise ( (resolve, reject) => {
    getAllExercises(user, (err, data) => {
      if (err) reject (new Error('could not get full exercise logs'));
      else resolve (data);
    });
  });
}

function getPartialLog(user, from, to, limit) {
  return new Promise((resolve, reject) => {
    getExercises(user, from, to, limit, (err, data) => {
      if (err) reject (new Error('could not fetch partial exercise logs'));
      else resolve(data);
    });
  });
}

function createExercise(exercise) {
  return new Promise ((resolve, reject) => {
    saveExercise(exercise, (err, data) => {
      if (err) reject (new Error('cannot save the exercise'));
      else resolve (data);
    });
  });
}

function formatPayload(data) {
  let log = data.exercises.map((e) => {return {description: e.description, duration: e.duration, date: e.date}});
  let payload = {_id: data.user._id, username: data.user.username, log:log};
  return payload;
}

module.exports = {
  getDate,
  getUser,
  getAllUsers,
  getFullLog,
  getPartialLog,
  createExercise,
  formatPayload
};

const mongoose = require('mongoose').set('debug', true);

const exerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration:{
    type: Number,
    required: true
  },
  date: Date
});

const createExercise = (e, done) => {
  var exercise = new Exercise({user_id: e.userId, description: e.description, duration: e.duration, date: e.date});
  exercise.save( (err, data) => {
    if (err) console.error(err);
    done(null, data);
  });
};

const getAllExercises = (user, done) => {
  Exercise.find({ user_id: user._id }, (err, data) => {
    if (err) return console.error(err);
    done(null, data);
  });
};

const getExercises = (user, from, to, limit, done) => {
  if (limit == undefined) limit = 0;
  Exercise.find({ user_id: user._id, date: { $gte:from, $lte:to } })
          .limit(limit)
          .exec((err, data) => {
            if (err) console.error(err);
            done(null, data);
          });
};

const Exercise = mongoose.model('Exercise', exerciseSchema);
module.exports = {
  createExercise,
  getAllExercises,
  getExercises
};

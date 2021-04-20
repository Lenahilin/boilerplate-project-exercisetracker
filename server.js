/** imports **/
const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose').set('debug', true);
const bodyParser = require('body-parser')
const morgan = require('morgan');

/** middleware **/
app.use(morgan('combined'))
app.use('/public', express.static(`${process.cwd()}/public`));
app.use('/api', bodyParser.urlencoded({extended: false})); 

/** homepage **/
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/** db setup **/
mongoose
  .connect( process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
  .then(() => console.log( 'Database Connected' ))
  .catch(err => console.log( err ));


const userSchema = new mongoose.Schema({
  // _id: mongoose.Schema.Types.ObjectId,
  username: {
    type: String,
    required: true
  } 
});

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

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

/** helpers **/
const getDate = () => { // yyyy-mm-dd
  let date = new Date();
  let y = date.getFullYear().toString();
  let m = date.getMonth() + 1;
  if (m < 10) m = '0' + m.toString();
  let d = date.getDate().toString();
  return y + '-' + m + '-' + d;
}


/** db methods **/
const createUser = (username, done) => {
  var user = new User({username: username});
  user.save((err, data)=> {
    if (err) return console.error(err);
    done(null, data);
  });
};

const getAllUsers = (filter, done)  => {
  User.find(filter).exec((err,data) => {
    if (err) console.error(err);
    done(null, data)
  })
};

const findUser = (id, done) => {
  User.findOne({_id: id}, (err, data) => {
    if (err) console.error(err);
    done(null, data);
  });
};

const createExercise = (user, e, done) => {
  var exercise = new Exercise({user_id: e.userId, description: e.description, duration: e.duration, date: e.date});
  exercise.save( (err, data) => {
    if (err) console.error(err);
    done(null, data);
  });
};

/** routing **/
/* create a new user POST username: /api/new-user */ 
app.post('/api/new-user', (req, res) => {
  createUser(req.body.username, (err, data) => {
    if (err) return res.json('oops something went wrong').send;
    return res.json({username: data.username, _id: data._id}).send();
  });
})

/* get all users */
app.get('/api/users', (req, res) => {
  getAllUsers({}, (err, data) => {
    if (err) return res.json('cannot get users').send();
    // TODO: implement via cursor for better performance 
    var result = data.map((record) => { return {username: record.username, _id: record._id}});
    res.send(result);
  })
});

// You can POST to /api/exercise/add with form data userId, description, duration, and optionally date. 
// If no date is supplied, the current date will be used. 
// The response returned will be the user object with the exercise fields added.
app.post('/api/exercise/add', (req, res) => { // /api/users/:_id/exercises
  if (!req.body.userId || !req.body.description || !req.body.duration) res.send('some of required data are missing');
  if (!req.body.date) req.body.date = getDate();

  findUser(req.body.userId, (err, data) => { 
    if (err) return res.send('the user does not exist');
    var user = data;
    createExercise(user, req.body, (err, data) => {
      if (err) res.send('could not save the exercise');
      var e = data;
      res.send({_id: user._id, username: user.username, exercise: {description: e.description, duration: e.duration, date: e.date}}); // TODO: better date formatting
    });
  });
 
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})




app.post('/api/exercise/add', (req, res) => {

  findUser(req.userId, (err, data) => { 
    if (err) return res.send('invalid userID');
    return user = data;
  });

  createExercise(req.body, (err, data) => {
    if (err) res.send('could not save the exercise');
    return e = data;
  });

  res.send(user, e)  
});
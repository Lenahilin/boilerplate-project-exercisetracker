/** imports **/
const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose').set('debug', true);
const bodyParser = require('body-parser')
const morgan = require('morgan');
const { get } = require('mongoose');

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

/* You can POST to /api/exercise/add with form data userId, description, duration, and optionally date.
   If no date is supplied, the current date will be used.
   The response returned will be the user object with the exercise fields added. */
app.post('/api/exercise/add', (req, res) => { // /api/users/:_id/exercises

  if (!req.body.userId || !req.body.description || !req.body.duration) res.send('some of required data are missing');
  if (!req.body.date) req.body.date = getDate();

  findUser(req.body.userId, (err, data) => { 
    if (err) res.send('error while connecting the db');
    if (data == null) return res.status(404).send('user not found');
    var user = data;
    createExercise(user, req.body, (err, data) => {
      if (err) res.send('could not save the exercise');
      var e = data;
      res.send({_id: user._id, username: user.username, exercise: {description: e.description, duration: e.duration, date: e.date}}); // TODO: better date formatting
    });
  });
});

/* You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user. 
   The returned response will be the user object with a log array of all the exercises added. 
   Each log item has the description, duration, and date properties.
   You can add from, to and limit parameters to a /api/users/:_id/logs request to retrieve part of the log of any user. 
   from and to are dates in yyyy-mm-dd format. 
   limit is an integer of how many logs to send back. */
app.get('/api/users/:_id/logs', (req, res) => {
  //TODO: paginations params validation
  /* callbacks */
  // findUser(req.params._id, (err, data) => {
  //   console.log('findUser data:', data);
  //   if (err) return res.send('error while connecting the db');
  //   if (data == null ) return res.status(404).send('user not found');
  //   var user = data;
  //   if (req.query.from && req.query.to) {
  //     getExercises(user, req.query.from, req.query.to, parseInt(req.query.limit), (err, data) => {
  //       if (err) return res.send('error while connecting to the db');
  //       var log = data.map((e) => {return {description: e.description, duration: e.duration, date: e.date}});
  //       var payload = {_id: user._id, username: user.username, log:log};
  //       return res.send(payload);
  //     });
  //   }
  //   else
  //     getAllExercises(user, (err, data) => {
  //       if (err) return res.send('cannot get exercise logs');
  //       var log = data.map((e) => {return {description: e.description, duration: e.duration, date: e.date}});
  //       var payload = {_id: user._id, username: user.username, log:log};
  //       res.send(payload);
  //     });
  // });

  /* promises */
  let getUser = new Promise( (resolve, reject) => {
    findUser(req.params._id, (err, user) => {
      if (err) reject('cannot connect to the db');
      resolve(user);
    });
  });

  let getFullLog = (user) => {
    getAllExercises(user, (err, data) => {
      if (err) return console.error('cannot get exercise logs');
      // var log = data.map((e) => {return {description: e.description, duration: e.duration, date: e.date}});
      // var payload = {_id: user._id, username: user.username, log:log};
      // res.send(payload);
      console.log('full log: ', data);
    });
  };

  let getLog = (user, from, to, limit) => {
    getExercises(user, from, to, limit, (err, data) => {
      if (err) return res.send('error while connecting to the db');
      // var log = data.map((e) => {return {description: e.description, duration: e.duration, date: e.date}});
      // var payload = {_id: user._id, username: user.username, log:log};
      // return res.send(payload);
      console.log('partial log:', data);
    });
  };
  var limit = 0;
  getUser.then(limit ? user => getLog(user, from, to, limit) : user => getFullLog(user));
  res.send();
});

/* trying out promises */
app.get('/api/user/:id', (req, res) => {

  let getUser = new Promise( (resolve, reject) => {
    findUser(req.params.id, (err, user) => {
      if (err) reject('cannot connect to the db');
      resolve(user);
    });
  });

  getUser.then(user => getAllExercises(user, (err, data) => {
    if (err) console.error('cannot connect to the db');
    console.log(user, data);
  }))

  res.send();
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});

/* TODO global: 
        - return 400 bad request when applicable
*/
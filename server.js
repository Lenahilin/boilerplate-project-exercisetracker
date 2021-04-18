/** imports **/
const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose');
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
  username: {
    type: String,
    required: true
  } 
});

const User = mongoose.model('User', userSchema);

/** db methods **/
const createUser = (username, done) => {
  var user = new User({username: username});
  user.save((err, data)=> {
    if (err) return console.error(err);
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

// app.get('/api/users', (req, res) => {
  
// });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

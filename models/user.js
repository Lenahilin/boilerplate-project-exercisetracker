const mongoose = require('mongoose').set('debug', true);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  } 
});

const User = mongoose.model('User', userSchema);

const createUser = (username, done) => {
  var user = new User({username: username});
  user.save((err, data)=> {
    if (err) return console.error(err);
    done(null, data);
  });
};

const findUser = (id, done) => {
  User.findOne({_id: id}, (err, data) => {
    if (err) console.error(err);
    done(null, data);
  });
};

const getAllUsers = (filter, done)  => {
  User.find(filter).exec((err,data) => {
    if (err) console.error(err);
    done(null, data)
  })
};

module.exports = {
  createUser,
  findUser,
  getAllUsers
};

const mongoose = require("mongoose");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

module.exports = function(passport, Coustomer, Shopkeeper){
    
passport.use(
    "coustomer-local",
    new LocalStrategy(function (username, password, done) {
      Coustomer.findOne({ username: username }, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, { message : 'User does not exists'});
        }
        bcrypt.compare(password, user.password, function (err, result) {
          if (!result) {
            return done(null, false, { message : 'You have entered a wrong password'});
          } else {
            return done(null, user, { message : 'Logged in successfully...'});
          }
        });
      });
    })
  );
  passport.use(
    "shopkeeper-local",
    new LocalStrategy(function (username, password, done) {
      Shopkeeper.findOne({ username: username }, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, { message : 'User does not exists'});
        } else {
          bcrypt.compare(password, user.password, function (err, result) {
            if (!result) {
              return done(null, false, { message : 'You have entered a wrong password'});
            } else {
              return done(null, user, { message : 'Logged in successfully...'});
            }
          });
        }
      });
    })
  );
  
  passport.serializeUser((user, done) => {
    if (user instanceof Coustomer) {
      done(null, { id: user.id, type: "Coustomer" });
    } else {
      done(null, { id: user.id, type: "Shopkeeper" });
    }
  });
  
  passport.deserializeUser(function (user, done) {
    if (user.type === "Shopkeeper") {
      Shopkeeper.findById(user.id, function (err, user) {
        done(err, user);
      });
    } else {
      Coustomer.findById(user.id, function (err, user) {
        done(err, user);
      });
    }
  });
}
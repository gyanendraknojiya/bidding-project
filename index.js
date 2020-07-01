//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
mongoose.set("useCreateIndex", true);
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());


const saltRounds = 10;

passport.use('coustomer-local',new LocalStrategy(
  function(username, password, done) {
    Coustomer.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      bcrypt.compare(password, user.password, function(err, result) {
        if (!result) { return done(null, false); }
      });
      console.log('Coustomer loggedIn successfully');
      return done(null, user);
    });
  }
));
passport.use('shopkeeper-local',new LocalStrategy(
  function(username, password, done) {
    console.log('shopkeeper Local Strategy called');
    Shopkeeper.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { 
        console.log('user not found');
        return done(null, false); 
      }
      bcrypt.compare(password, user.password, function(err, result) {
        if (!result) { 
          console.log('password not matched');
          return done(null, false); 
        }
      });
      console.log('loggedIn successfully');
      return done(null, user);
    });
  }
));

// passport.serializeUser(function(user, done) {
//   done(null, user.id);
// });


passport.serializeUser((user, done) => {
  if (user instanceof Coustomer) {
    done(null, { id: user.id, type: 'Coustomer' });
  } else {
    done(null, { id: user.id, type: 'Shopkeeper' });
  }
});

// passport.deserializeUser(function(id, done) {
//   Coustomer.findById(id, function (err, user) {
//     done(err, user);
//   });
// });

// passport.deserializeUser(function(id, done) {
//   console.log(id.)
//   Shopkeeper.findById(id, function (err, user) {
//     done(err, user);
//   });
// });

passport.deserializeUser(function(user, done) {
  console.log(user)
  if (user.type === 'Shopkeeper') {
    Shopkeeper.findById(user.id, function (err, user) {
   done(err, user);})
  } else {
    Coustomer.findById(user.id, function (err, user) {
      done(err, user);})
  }
});


mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const productSchema = new mongoose.Schema({
  name: String,
  details: String,
  image: String,
  price: Number,
  adminID: String,
  bid: [
    {
      bidPrice: Number,
      email: String,
      USERid: String,
      productName: String,
    },
  ],
});

const Product = new mongoose.model("Products", productSchema);

const Shopkeeper = new mongoose.model("Shopkeeper", userSchema);
const Coustomer = new mongoose.model("Coustomer", userSchema);



app.get("/", function (req, res) {
  res.render("home");
});
app.get("/shopkeeper-login", function (req, res) {
  if (!req.isAuthenticated()) {
    res.render("shopkeeper-login");
  } else {
    res.redirect("admin");
  }
});
app.get("/coustomer-login", function (req, res) {
  if (!req.isAuthenticated()) {
    res.render("coustomer-login");
  } else {
    res.redirect("products");
  }
});
app.get("/coustomer-register", function (req, res) {
  if (!req.isAuthenticated()) {
    res.render("coustomer-register");
  } else {
    res.redirect("products");
  }
});
app.get("/shopkeeper-register", function (req, res) {
  if (!req.isAuthenticated()) {
    res.render("shopkeeper-register");
  } else {
    res.redirect("admin");
  }
});

app.get("/products", function (req, res) {
  if (req.isAuthenticated()) {
    const userEmail = req.user.username;
    Coustomer.findOne({ username: userEmail }, function (err, result) {
      if (err) {
        console.log(err);
        res.redirect("home");
      } else {
        Product.find({}, function (err, products) {
          if (err) {
            console.log(err);
            res.redirect("home");
          } else {
            res.render("products", {
              userID: result._id,
              email: result.username,
              products: products,
              error: req.flash("error"),
              success: req.flash("success"),
            });
          }
        });
      }
    });
  } else {
    res.redirect("/coustomer-login");
  }
});

app.get("/admin", function (req, res) {
  if (req.isAuthenticated()) {
    const userEmail = req.user.username;
    Shopkeeper.findOne({ username: userEmail }, function (err, result) {
      if (err) {
        console.log(err);
        res.redirect("home");
      } else {
        Product.find({ adminID: result.id }, function (err, products) {
          if (err) {
            console.log(err);
            res.redirect("home");
          } else {
            res.render("admin", {
              userID: result.id,
              email: result.username,
              products: products,
            });
          }
        });
      }
    });
  } else {
    res.redirect("/shopkeeper-login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/shopkeeper-login",
  passport.authenticate('shopkeeper-local', { failureRedirect: '/shopkeeper-login' }),
  function(req, res) {
    res.redirect('/admin');
});



app.post('/coustomer-login', 
  passport.authenticate('coustomer-local', { failureRedirect: '/coustomer-login' }),
  function(req, res) {
    res.redirect('/products');
  });


app.post("/coustomer-register", function (req, res) {
  Coustomer.findOne({ username: req.body.username }, function (err, result) {
    if (!result) {
      bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
          const newCoustomer = new Coustomer ({
            username : req.body.username,
            password: hash
          })
          newCoustomer.save()
        });
        res.redirect('/coustomer-login')
    });
    } else {
      res.send("Account already exists");
    }
  });
});

app.post("/shopkeeper-register", function (req, res) {
  Shopkeeper.findOne({ username: req.body.username }, function (err, result) {
    if (!result) {
      bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
          const newShopkeeper = new Shopkeeper ({
            username : req.body.username,
            password: hash
          })
          newShopkeeper.save()
        });
        res.redirect('/shopkeeper-login')
    });
    } else {
      res.send("Account already exists");
    }
  });
});

app.post("/admin", function (req, res) {
  const newProduct = new Product({
    name: req.body.name,
    details: req.body.details,
    image: req.body.image,
    price: req.body.price,
    adminID: req.body.userID,
  });
  newProduct.save();
  res.redirect("/admin");
});

app.post("/products", function (req, res) {
  Product.findById(req.body.productID, function (err, result) {
    if (err) {
      console.log(err);
      res.redirect("/products");
    } else if (result.price > req.body.bid) {
      req.flash("error", "Bid is less than price. Please increase your bid!");
      res.redirect("/products");
    } else {
      Product.findOneAndUpdate(
        { _id: result.id },
        {
          $push: {
            bid: {
              bidPrice: req.body.bid,
              email: req.body.email,
              USERid: req.body.userID,
              productName: req.body.productName,
            },
          },
        },
        function (error, success) {
          if (error) {
            console.log(error);
          } else {
            req.flash("success", "Your bid is sent to the seller.");
            res.redirect("/products");
          }
        }
      );
    }
  });
});

app.listen(process.env.PORT, function () {
  console.log("Server is running at port " + process.env.PORT);
});

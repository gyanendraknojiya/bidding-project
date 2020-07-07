//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");



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
mongoose.set('useFindAndModify', false);

app.use(flash())

app.use(function(req, res, next) {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(passport.initialize());
app.use(passport.session());

const saltRounds = 10;






const Coustomer = require('./Models/customer.model')
const Shopkeeper = require('./Models/shopkeeper.model')
const Product = require('./Models/products.model')

require('./passport/passport.config')(passport, Coustomer, Shopkeeper)

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
    if (req.user.role === "coustomer") {
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
              });
            }
          });
        }
      });
    } else {
      req.logout();
      res.redirect("/coustomer-login");
    }
  } else {
    res.redirect("/coustomer-login");
  }
});

app.get("/admin", function (req, res) {
  if (req.isAuthenticated()) {
    if (req.user.role === "Shopkeeper") {
      const userEmail = req.user.username;
      Shopkeeper.findOne({ username: userEmail }, function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("home");
        } else {
          Product.find({ adminID: user.id }, function (err, products) {
            if (err) {
              console.log(err);
              res.redirect("home");
            } else {
              res.render("admin", {
                User: user,
                products: products,
              });
            }
          });
        }
      });
    } else {
      req.logout();
      res.redirect("/shopkeeper-login");
    }
  } else {
    res.redirect("/shopkeeper-login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post(
  "/shopkeeper-login",
  passport.authenticate("shopkeeper-local", {
    failureRedirect: "/shopkeeper-login",
    successRedirect: "/admin",
    failureFlash: true
  })
);

app.post("/coustomer-login", passport.authenticate("coustomer-local", {
    failureRedirect: "/coustomer-login", successRedirect: "/products", failureFlash: true,
  }));

app.post("/coustomer-register", function (req, res) {
  const { name, username, password, confirmpassword, mobile } = req.body;
  if (name && username && password && mobile && confirmpassword) {
    if (password === confirmpassword) {
      Coustomer.findOne({ username: username }, function (err, result) {
        if (!result) {
          bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(password, salt, function (err, hash) {
              const newCoustomer = new Coustomer({
                name: name,
                mobile: mobile,
                username: username,
                password: hash,
                role: "coustomer",
              });
              newCoustomer.save();
            });
            req.flash("success", "Registered Successfully! Please Login....");
            console.log("registered");
            res.redirect("coustomer-login");
          });
        } else {
          var error = "Email already registered";
          res.render("coustomer-register", { error: error });
        }
      });
    } else {
      var error = "Password not Matched";
      res.render("coustomer-register", { error: error });
    }
  } else {
    var error = "Please fill all the fields";
    res.render("coustomer-register", { error: error });
  }
});

app.post("/shopkeeper-register", function (req, res) {
  const { name, username, password, confirmpassword, mobile } = req.body;
  if (name && username && password && mobile && confirmpassword) {
    if (password === confirmpassword) {
      Shopkeeper.findOne({ username: username }, function (err, result) {
        if (!result) {
          bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(password, salt, function (err, hash) {
              const newShopkeeper = new Shopkeeper({
                name: name,
                mobile: mobile,
                username: username,
                password: hash,
                role: "Shopkeeper",
              });
              newShopkeeper.save();
            });
            req.flash("success", "Registered Successfully! Please Login....");
            res.redirect("shopkeeper-login");
          });
        } else {
          var error = "Email already registered";
          res.render("shopkeeper-register", { error: error });
        }
      });
    } else {
      var error = "Password not Matched";
      res.render("shopkeeper-register", { error: error });
    }
  } else {
    var error = "Please fill all the fields";
    res.render("shopkeeper-register", { error: error });
  }
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
  req.flash("success", "Product Added successfully....");
  res.redirect("/admin");
});

app.post("/products", function (req, res) {
  Product.findById(req.body.productID, function (err, result) {
    if (err) {
      console.log(err);
      res.redirect("/products");
    } else if (result.price >= req.body.bid) {
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

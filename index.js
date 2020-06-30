//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const alert = require("alert")

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
mongoose.set("useCreateIndex", true);
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

mongoose.set("useFindAndModify", false);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
userSchema.plugin(passportLocalMongoose);

const productSchema = new mongoose.Schema({
  name: String,
  details: String,
  image: String,
  price: Number,
  adminID: String,
  bid: [{
    bidPrice: Number,
    email: String,
    USERid: String,
    productName: String
  }],
});

const Product = new mongoose.model("products", productSchema);

const shopkeeper = new mongoose.model("shopkeeper", userSchema);
const coustomer = new mongoose.model("coustomer", userSchema);

passport.use(shopkeeper.createStrategy());

passport.serializeUser(shopkeeper.serializeUser());
passport.deserializeUser(shopkeeper.deserializeUser());

passport.use(coustomer.createStrategy());

passport.serializeUser(coustomer.serializeUser());
passport.deserializeUser(coustomer.deserializeUser());

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
    const userEmail = req.session.passport.user;
    coustomer.findOne({ username: userEmail }, function (err, result) {
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
              userID: result.id,
              email: result.username,
              products: products,
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
    const userEmail = req.session.passport.user;
    shopkeeper.findOne({ username: userEmail }, function (err, result) {
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

app.get("/products", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("products");
  } else {
    res.redirect("/coustomer-login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/shopkeeper-login", function (req, res) {
  const user = new shopkeeper({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/shopkeeper-login");
    }
    return res.redirect("/admin");
  });
});
app.post("/coustomer-login", function (req, res) {
  const user = new coustomer({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/coustomer-login");
    }
    return res.redirect("/products");
  });
});

app.post("/coustomer-register", function (req, res) {
  coustomer.findOne({ username: req.body.username }, function (err, result) {
    if (!result) {
      coustomer.register(
        { username: req.body.username },
        req.body.password,
        function (err, user) {
          if (err) {
            console.log(err);
            res.redirect("/coustomer-register");
          } else {
            passport.authenticate("local")(req, res, function () {
              console.log("registed");
              res.redirect("/products");
            });
          }
        }
      );
    } else {
      res.send("Account already exists");
    }
  });
});

app.post("/shopkeeper-register", function (req, res) {
  shopkeeper.findOne({ username: req.body.username }, function (err, result) {
    if (!result) {
      shopkeeper.register(
        { username: req.body.username },
        req.body.password,
        function (err, user) {
          if (err) {
            console.log(err);
            res.redirect("/shopkeeper-register");
          } else {
            passport.authenticate("local")(req, res, function () {
              console.log("registed");
              res.redirect("/admin", { shopkeeperID: id });
            });
          }
        }
      );
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
    alert('Bid should be more than pproduct price')
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
              productName: req.body.productName
            },
          },
        },
        function (error, success) {
          if (error) {
            console.log(error);
          } else {
            res.redirect("/products");
          }
        }
      );
    }
  });
});

app.listen(process.env.PORT, function () {
  console.log('Server is running at port ' + process.env.PORT);
});

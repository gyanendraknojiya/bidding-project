const mongoose = require('mongoose')

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

  module.exports = Product;
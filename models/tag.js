var mongoose = require('mongoose');

var tagSchema= mongoose.Schema({
    name:{
        type:[String],
        index:true
    }
})
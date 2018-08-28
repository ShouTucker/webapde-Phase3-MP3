var mongoose = require('mongoose');

var tagSchema= mongoose.Schema({
    name:{
        type:[String],
        index:true
    }
})

var UsersSchema = mongoose.Schema({
    username: {
        type: [String],
        index:true
    }
});

var PostSchema = mongoose.Schema({
    
    title: {
        
        type : String,
        index: true
        
    },
    username:{
        type:String,
        index:true
    },
    
    image: {
        
        type: String,
        index: true
        
    },
    tag: [tagSchema],
    
     Privacy: {

        type:String,
        default:false

     },
    
    Users:{
        type: [UsersSchema],
        index:true
    }


})

    var Upload = mongoose.model("post", PostSchema)
    
    module.exports = {
        
        Upload
        
    }

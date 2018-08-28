var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');


var PostSchema = mongoose.Schema({
    
    title: {
        
        type : String,
        index: true
        
    },
    
    image: {
        
        type: String,
        index: true
        
    },
    
    Privacy: {
    
        type:String,
        default:false
}

})

var UserSchema = mongoose.Schema({
    username: {
        type: String,
        index:true
    },
    password: {
        type: String
    },
    post: [PostSchema]
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.createUser = function(newUser, callback){
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newUser.password, salt, function(err, hash) {
        // Store hash in your password DB.
            newUser.password = hash;
            newUser.save(callback);
        });
    });
}

module.exports.getUserByUsername = function(username,callback){
    var query= {username:username};
    User.findOne(query,callback);
}

module.exports.getUserById = function(id,callback){
    User.findById(id,callback);
}

module.exports.comparePassword=function(candidatePassword,hash,callback){
    bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
        if(err) throw err;
        callback(null, isMatch);
    });
};
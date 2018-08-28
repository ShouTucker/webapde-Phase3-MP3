var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy= require('passport-local'),Strategy;
var mongo= require('mongodb');
var mongoose= require('mongoose');
mongoose.connect('mongodb://localhost:27017/phase2',{ useNewUrlParser: true });
var db = mongoose.connection;
const hbs= require("hbs");
const multer = require('multer');
const ejs = require('path');
const crypto=require('crypto');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
var engines = require('consolidate');

var routes = require('./routes/index');
var users = require('./routes/users');
const profileController = require('./controllers/profile');
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultlayout:'layout'}));
app.engine('ejs',engines.ejs);
app.set('view engine','hbs');
app.set('view options',{layout:'layout'})

app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(methodOverride('_method'));

const mongoURI = 'mongodb://localhost:27017/phase2';

const conn= mongoose.createConnection(mongoURI,{useNewUrlParser:true});

const {Upload} = require('./models/post');
const {Tags} = require('./models/tag');
const User= require('./models/user');

let gfs;

conn.once('open', ()=>{
    gfs= Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
    var collection=gfs.collection('uploads');
});

var storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex')+ path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


app.use(express.static(path.join(__dirname,'public')));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(function(req,res,next){
    res.locals.succes_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

app.get('/home', ensureAuthenticated, function(req,res){
   gfs.files.find({$or:[{Privacy: "False"}, {"Users.username": res.locals.user.username}]}).toArray((err,files)=>{
       if(!files || files.length===0){
            res.render('home',{files:false})
          }else{
              files.map(file =>{
                  if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
                      {
                          file.isImage = true;
                      }else{
                          file.isImage= false;
                      }
              });
              res.render('home',{files:files});
          }
   }); 
    
});

app.get('/upload',function(req,res){
    res.render('upload');
});

app.post('/upload',upload.single('file'),(req,res)=>{
    
    var title = req.body.title;
    var username= res.locals.user.username;
    var image = req.file.filename;
    var tag = req.body.tag;
    var Privacy = req.body.Privacy;
    var Users = req.body.Users;
    
    console.log("tag "+tag);
    var tagSplit = tag.split(" ");
    console.log(tagSplit[0]);
    
    var temp = Users.concat(" "+res.locals.user.username);
    var usersSplit = temp.split(" ");
    
    if(Privacy===(false)){
        var t = new Upload({

            title,
            username,
            image,
            tag:{
                name: tagSplit
            },
            Privacy,
            Users:{
                username:null
            }
        })
    }
    else{
        var t = new Upload({

            title,
            username,
            image,
            tag:{
                name: tagSplit
            },
            Privacy,
            Users:{
                username: usersSplit
            }
        })
    }
    
    t.save().then(()=>{
        var collection=gfs.collection('uploads');
        collection.insert(t);
        var ucoll = db.collection('users')
        ucoll.update({username: username},{$push:{"post":{title:title,image:image,Privacy:Privacy}}});
        res.render("home.hbs")
        
        }) 
    
    res.redirect('/home');
    
});

app.get('/files',(req,res)=>{
   gfs.files.find().toArray((err,files)=>{
       if(!files || files.length==0){
            return res.status(404).json({
                err:'No files exist'
            });
          }
       return res.json(files);
   }); 
});

app.get('/image/:filename',(req,res)=>{
   gfs.files.findOne({filename:req.params.filename},(err,file)=>{
       if(!file || file.length==0){
            return res.status(404).json({
                err:'No file exist'
            });
          }
       if(file.contentType === 'image/jpeg' || file.contentType === 'img/jpg'){
           const readstream= gfs.createReadStream(file.filename);
           readstream.pipe(res);
        } else{
            res.status(404).json({
                err:'not an image'
            });
        }
   }); 
});

app.get('/view/:filename',function(req,res){
    gfs.files.findOne({image:req.params.filename},(err,files)=>{
        console.log(files);
        res.render('view',{files:files});
    });
});

app.get('/files/:filename',(req,res)=>{
   gfs.files.findOne({filename:req.params.filename},(err,file)=>{
       if(!file || file.length==0){
            return res.status(404).json({
                err:'No file exist'
            });
          }
       return res.json(file);
   }); 
});

app.get('/profile', function(req,res) {
    
    gfs.files.find({username:res.locals.user.username}).toArray((err,files)=>{
       if(!files || files.length===0){
            res.render('profile',{files:false})
          }else{
              files.map(file =>{
                  if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
                      {
                          file.isImage = true;
                      }else{
                          file.isImage= false;
                      }
              });
              res.render('profile',{files:files,username:res.locals.user.username});
          }
   }); 
    
});

app.get('/search',(req, res)=>{
    var query = {"tag.name": req.query.searchbar}
    console.log("bar "+req.query.searchbar);
    gfs.files.find(query).toArray((err,files)=>{
        if (err) throw err
        if(!files || files.length===0){
            res.render('home',{files:false})
        }else{
          console.log(files.title);
          files.map(file =>{
              if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
              {
                  file.isImage = true;
              }else{
                  file.isImage= false;
              }
          });
          res.render('search',{files:files});
        }
    })   
});

/*app.get('/view/search',(req, res)=>{
    var query = {"tag.name": req.query.searchbar}
    console.log("bar "+req.query.searchbar);
    gfs.files.find(query).toArray((err,files)=>{
        if (err) throw err
        if(!files || files.length===0){
            res.render('home',{files:false})
        }else{
          console.log(files.title);
          files.map(file =>{
              if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
              {
                  file.isImage = true;
              }else{
                  file.isImage= false;
              }
          });
          res.render('home',{files:files});
        }
    })   
});

app.get('/profile/search',(req, res)=>{
    var query = {"tag.name": req.query.searchbar}
    console.log("bar "+req.query.searchbar);
    gfs.files.find(query).toArray((err,files)=>{
        if (err) throw err
        if(!files || files.length===0){
            res.render('profile',{files:false})
        }else{
          console.log(files.title);
          files.map(file =>{
              if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
              {
                  file.isImage = true;
              }else{
                  file.isImage= false;
              }
          });
          res.render('profile',{files:files});
        }
    })   
});*/

app.get('/profile/:filename', function(req,res) {
    
    gfs.files.find({username:req.params.filename}).toArray((err,files)=>{
       if(!files || files.length===0){
            res.render('profile',{files:false})
          }else{
              res.render('visit',{files:files,username:res.locals.user.username});
          }
   }); 
    
});


function ensureAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash('error_msg','You are not logged in');
        res.redirect('/users/login');
    }
}


app.use('/', routes);
app.use('/users', users);

app.listen(3000, ()=>console.log('listening'));
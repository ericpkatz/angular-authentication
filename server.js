var Sequelize = require('sequelize');
var db = new Sequelize(process.env.DATABASE_URL);

var User = db.define('user', {
  name: Sequelize.STRING, 
  password: Sequelize.STRING
});

if(process.env.SYNC){
  db.sync({ force: true })
    .then(function(){
      return Promise.all([
          User.create({ name: 'moe', password: 'foo'}),
          User.create({ name: 'larry', password: 'bar' })
      ]);
    })
    .catch(function(err){
      console.log(err);
    });
}

var express = require('express');
var swig = require('swig');
swig.setDefaults({ cache: false });
var path = require('path');
var app = express();
app.use(require('express-session')( { secret: process.env.SECRET }));
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use('/browser', express.static(path.join(__dirname, 'browser')));
app.use(require('body-parser').json());
app.use(require('method-override')('_method'));

app.engine('html', swig.renderFile);
app.set('view engine', 'html');

app.use(function(req, res, next){
  if(!req.session.userId)
    return next();
  User.findById(req.session.userId)
    .then(function(user){
      res.locals.user = user;
      next();
    })
    .catch(next);

});

app.get('/', function(req, res, next){
  res.render('index');
});

app.get('/login', function(req, res, next){
  res.render('login');
});

function restrict(req, res, next){
  if(res.locals.user)
    return next();
  res.sendStatus(401);
}

app.get('/restricted', restrict, function(req, res, next){
  res.render('restricted');
});

app.get('/api/sessions', function(req, res, next){
  if(res.locals.user)
    return res.send(res.locals.user);
  res.sendStatus(401);
});

app.post('/api/sessions', function(req, res, next){
  console.log(req.body);
  User.findOne({ where: { name: req.body.name, password: req.body.password}})
    .then(function(user){
      if(user){
        req.session.userId = user.id;
        return res.send(user);
      }
      else {
        return res.sendStatus(401);
      }
    })
    .catch(next);
});

app.delete('/api/sessions', function(req, res, next){
  req.session.destroy();
  res.sendStatus(200);
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('listening on port ' + port);
});


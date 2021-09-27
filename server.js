const express = require('express');
const path = require('path');
const discordApi = require("./DAL/discordApi");
const cookieParser = require('cookie-parser');
const appSettings = require("./settings.json");
const discordCredentials = appSettings.discord;
const url = require('url');
const fetch = require('node-fetch');

var sessionParser = require('express-session')({
    cookie: {
      path: '/', 
      secure: appSettings.secureCookie, 
      httpOnly: true,
      maxAge: 40 * 24 * 60 * 60 * 1000 // 40 days
    },
    secret: appSettings.secret,
    resave: false,
    saveUninitialized: true,
    name: 'shell-token.sid',
    key: 'session_cookie_name',
  });

const app = express();

// the proxy will be http, nginx will manage https and certs
var server = require("http").createServer(app);

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(sessionParser);
app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/fav', express.static(__dirname + '/fav'));
app.use(express.urlencoded());
app.use(cookieParser());

async function discordLoginPage (req, res) {
  const urlObj = url.parse(req.url, true);

  if (urlObj.query.code) {
    const accessCode = urlObj.query.code;
    const data = {
        client_id: discordCredentials.client_id,
        client_secret: discordCredentials.client_secret,
        grant_type: 'authorization_code',
        redirect_uri: discordCredentials.redirect_uri,
        code: accessCode,
        scope: 'identify',
    };

    var response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams(data),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    var info = await response.json();

    var userInfoRequest = await fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${info.token_type} ${info.access_token}`,
        },
    });    

    var userData = await userInfoRequest.json();

    var roles = [];
    
    // for voting, we don't care about member roles
    try {
      roles = await discordApi.getMemberRoles(userData.id);
    } catch (error) {
      // user might not be a member of r/Splatoon discord, but that's ok
    }

    req.session.userId = userData.id;
    req.session.username = userData.username + "#" + userData.discriminator;
    req.session.createdon = userData.id;

    if (userData.avatar) {
      req.session.avatar = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}`;
    } else {
      req.session.avatar = `/css/img/discord.png`;
    }

    // role check logic goes here
    // example:
    /*
    if (roles.filter(x => appSettings.roles.mod.includes(x)).length > 0) {
        req.session.isMod = true;
    } else {
        req.session.isMod = false;
    }
    */
  }

  res.redirect('/');
}

async function rootPage(req, res) {
  res.render(path.join(__dirname, '/html/index.html'), {
      id: req.session.userId,
      username: req.session.username,
      avatar: req.session.avatar,
      loginUrl: appSettings.discord.login_uri
  });
  return;
}

app.get('/', rootPage);
app.get('/discordlogin', discordLoginPage);

app.get('/logout', (req, res) => {
  req.session.destroy();

  res.render(path.join(__dirname, '/html/logout.html'), {
    loginUrl: appSettings.discord.login_uri
  });
});

server.listen(appSettings.port);
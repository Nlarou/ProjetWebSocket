const express = require("express");
const app = express();
var session = require("express-session");
var FileStore = require("session-file-store")(session);
var bodyParser = require("body-parser");
var server = require("http").createServer(app);
const io = require("socket.io").listen(server);
var fs = require("fs");
ent = require("ent"); // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
const port = 8080;
const ONE_HOUR = 3600000;
const SESSION_NAME = "Classe_Virtuel";
const SECRET = "ClassVirt333";
var mysql = require("mysql");
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "classevirtuel"
});
//Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var fileStoreOptions = {};

app.use(express.static("client"));

app.use(
  session({
    name: SESSION_NAME,
    genid: function() {
      return uuidv4();
    },
    store: new FileStore(fileStoreOptions),
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: ONE_HOUR }
  }),
  express.urlencoded({ extended: true })
);

// Chargement de la page index.html
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/client/login.html");
});

var listeConnected = new Array();

//Prend le cookie dans le navigateur et renvoi les info navigateur
app.get("/getUserConnected", function(req, res) {
  res.send(listeConnected);
});
app.post("/deconnectUser", function(req, res) {
  var user = req.session.user;
  req.session.destroy(function(err) {
    if (err) {
      console.error(err);
    } else {
      io.sockets.emit("deconnexion_client", user.email);
      console.log("Deconnection: " + user.email);
      res.clearCookie(SESSION_NAME);
      res.send(200);
    }
  });
});
//Donne une liste de tout les utilisateurs connecter
app.get("/infoUserConnected", function(req, res) {
  res.send(req.session.user);
});

//Authentification du professeur et des eleves
app.post("/authentification", function(request, response) {
  console.log("email recu: " + JSON.stringify(request.body.email));
  console.log("Mots de passe recu: " + JSON.stringify(request.body.password));
  var email = request.body.email;
  var password = request.body.password;
  if (email && password) {
    con.query("select password from user where email = ?", [email], function(
      err,
      result,
      fields
    ) {
      if (err) throw err;
      if (result.length == 0) {
        console.log("Mauvais Username");
        response.redirect("/login.html");
      } else if (result.length > 0) {
        if (result[0].password != password) {
          console.log("Mauvais Password");
          response.redirect("/login.html");
        }
      }
    });
    con.query(
      "SELECT id,nom,prenom,email,type_id FROM user WHERE email = ?",
      [email],
      function(err, result, fields) {
        if (err) throw err;
        if (result.length > 0) {
          request.session.user = {
            id: result[0].id,
            email: email,
            prenom: result[0].prenom,
            nom: result[0].nom,
            type: result[0].type_id
          };
          console.log(
            "Recu from DB(id:" +
              result[0].id +
              " nom: " +
              result[0].prenom +
              " " +
              result[0].nom +
              " email:" +
              result[0].email +
              " type: " +
              result[0].type_id +
              ")"
          );
          type = result[0].type_id;
          if (type == 1) {
            response.redirect("/portailProfesseur.html");
          } else {
            response.redirect("/portailEleve.html");
          }
        }
      }
    );
  } else {
    console.log("Aucun");
  }
});

io.sockets.on("connection", function(socket, user, message) {
  // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
  socket.on("nouveau_client", function(user) {
    console.log("Connection:" + user.email);
    listeConnected.push(user.email);
    email = ent.encode(user.email);
    socket.email = email;
    socket.type = user.type;
    socket.data = socket.broadcast.emit("nouveau_client", user);
  });

  // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
  socket.on("nouveau_message", function(message) {
    console.log(socket.email + ":" + message);
    if (!message.startsWith("/bypass")) {
      message = ent.encode(message);
      socket.broadcast.emit("nouveau_message", {
        email: socket.email,
        message: message,
        type: socket.type
      });
    } else {
      var new_Message = message.split("/bypass");
      socket.broadcast.emit("nouveau_message", {
        pseudo: socket.email,
        message: "*COMMAND EXECUTED*" + new_Message[1],
        type: socket.type
      });
    }
  });
  //Lors de la deconnexion d'une personne on evoie une notification au autre.
  socket.on("deconnexion_client", function(user) {
    console.log("Deconnexon:" + user.email);
    for (var i = 0; i < listeConnected.length; i++) {
      if (listeConnected[i] == user.email) {
        listeConnected.splice(i, 1);
      }
    }
    socket.broadcast.emit("deconnexion_client", user);
  });
});

server.listen(port, () => console.log("listening on port " + port));

//Genere un string random
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

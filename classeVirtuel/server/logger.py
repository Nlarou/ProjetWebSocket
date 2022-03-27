# Author: Nathaniel Larouche
import socketio
import time
import mysql.connector
import ast
from datetime import datetime

## Connection a la base de donnee
print("Initialisation")
conn = mysql.connector.connect(
    host="localhost", user="root", passwd="", database="classevirtuel"
)
c = conn.cursor()
## les deleguees
def on_connect():
    print("connect")


def on_disconnect():
    print("disconnect")


def on_reconnect():
    print("reconnect")


## Nouvelle connection
def nouveau_client(*args):
    chaine = str(args)
    chaine = chaine[1 : len(chaine) - 2]
    a = ast.literal_eval(chaine)
    print("Connection USER: " + str(a["email"]))
    SqlQuerry = "select id from user where email = '" + str(a["email"]) + "'"
    c.execute(SqlQuerry)
    result = c.fetchall()
    id = 0
    for id in result:
        id = id[0]

    c.execute(
        "Insert Into logger(user_id, Type, Timestamp) Values ('"
        + str(id)
        + "', 'login', '"
        + str(datetime.now())
        + "');"
    )
    conn.commit()


def deconnexion_client(*args):
    chaine = str(args)
    chaine = chaine[1 : len(chaine) - 2]
    a = ast.literal_eval(chaine)
    print("Deconnexion USER: " + str(a["email"]))
    SqlQuerry = "select id from user where email = '" + str(a["email"]) + "'"
    c.execute(SqlQuerry)
    result = c.fetchall()
    id = 0
    for id in result:
        id = id[0]

    c.execute(
        "Insert Into logger(user_id, Type, Timestamp) Values ('"
        + str(id)
        + "', 'deconnexion', '"
        + str(datetime.now())
        + "');"
    )
    conn.commit()


## Code execute lorsqu'on a un nouveau message
def sendMessage(*args):
    chaine = str(args)
    chaine = chaine[1 : len(chaine) - 2]
    a = ast.literal_eval(chaine)
    print("Message envoye: " + str(a))
    SqlQuerry = "select id from user where email = '" + a["email"] + "'"
    c.execute(SqlQuerry)
    result = c.fetchall()
    id = 0
    for id in result:
        id = id[0]
    c.execute(
        "Insert Into logger(user_id, Message,Type,timestamp) Values ('"
        + str(id)
        + "', '"
        + a["message"]
        + "', 'message' , '"
        + str(datetime.now())
        + "');"
    )
    conn.commit()


## 'main'
sio = socketio.Client()
sio.connect("http://localhost:8080")
sio.on("connect", on_connect)
sio.on("disconnect", on_disconnect)
sio.on("reconnect", on_reconnect)
sio.on("nouveau_client", nouveau_client)
sio.on("deconnexion_client", deconnexion_client)
sio.on("nouveau_message", sendMessage)

## Loop principal
sio.wait()

## On fait le menage
c.close()
conn.close()

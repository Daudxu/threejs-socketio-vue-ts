const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
var log4js = require('log4js');
log4js.configure('./log4js.json');
var logger = require('log4js').getLogger("index");

const { Server } = require("socket.io");
var io = new Server(server,{ cors: true });
const cors = require('cors');
app.use(cors());
const port = 3000;
// 设置一个默认房间
const roomName = "gameRome"
var roomInfo = {};

io.on('connection', async (socket) => {
    let total = io.engine.clientsCount;
    let user = '';
    console.log('Server Connection Success ID', socket.id);
    logger.info(total);
    // 加入游戏房间
    socket.on('join', function (userName) {
        user = userName;
        // 将用户昵称加入房间名单中
        if (!roomInfo[roomName]) {
            roomInfo[roomName] = [];
        }
        roomInfo[roomName].push(user);
        // 加入房间
        socket.join(roomName);
        // 通知房间内人员
        io.to(roomName).emit('system', user + ' join the game ', roomInfo[roomName]);  
        console.log(user + ' joined room ' + roomName);
    });
    socket.on('message',function (data) {
        socket.broadcast.emit('message', data);
    })
    // 断开
    socket.on('leave', function () {
        socket.emit('disconnect');
    });
    // 断开则从房间名单中移除玩家
    socket.on('disconnect', function () {
        if(user){
            var index = roomInfo[roomName].indexOf(user);
            if (index !== -1) {
              roomInfo[roomName].splice(index, 1);
            }
            io.to(roomName).emit('system', user + ' Leaving the game ', roomInfo[roomName]);
            io.to(roomName).emit('removAvatar', user);
            console.log(user + ' Leaving the ' + roomName);
            socket.leave(roomName); 
        }
      });
    // 接收用户消息,发送相应的房间
    socket.on('roomMessage', function (msg) {
        // 验证如果用户不在房间内则不给发送
        if(user){
            if (roomInfo[roomName].indexOf(user) === -1) {  
                return false;
            }
            io.to(roomName).emit('roomMessage', user, msg);
        }

    });

    // socket 用户首次登录拉取房间所有用户角色数据(角色对象，位置信息，四元素)
    socket.on('roleBroadcasting', function (msg) {
        // 验证如果用户不在房间内则不给发送
        if(user){
            if (roomInfo[roomName].indexOf(user) === -1) {  
                return false;
            }
            io.to(roomName).emit('roomMessage', user, msg);
        }

    });
    // socket 玩家角色位置广播(角色对象名称，位置信息，四元素)
    socket.on('rolePosition', function (msg) {
        // 验证如果用户不在房间内则不给发送
        if(user){
            if (roomInfo[roomName].indexOf(user) === -1) {  
                return false;
            }
            io.to(roomName).emit('roomMessage', user, msg);
        }

    });
    // webRTC 语音信令服务器广播
    socket.on('webRtcSignaling', function (msg) {
        // 验证如果用户不在房间内则不给发送
        if(user){
            if (roomInfo[roomName].indexOf(user) === -1) {  
                return false;
            }
            io.to(roomName).emit('roomMessage', user, msg);
        }

    });
    // webRTC 语音服务
    // webRTC 视频服务
});

// const removeUser = (objects, key, value) => {
//     return objects.filter(function(object) {
//       return object[key] !== value;
//     });
// }

app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Headers', ['mytoken','Content-Type']);
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    // res.header("Content-Type", "application/json;charset=utf-8");
    res.header("Content-Type", 'charset=utf-8');
    next();
});

server.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
});


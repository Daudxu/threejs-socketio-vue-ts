<script setup lang="ts">
import * as THREE from "three";
// import { renderAPI } from "./lib/renderAPI";
import io from 'socket.io-client'
import { onMounted, ref, reactive, nextTick, computed } from "vue"
import { Swiper, SwiperSlide } from 'swiper/vue';
import { EffectCards } from 'swiper';
import 'swiper/css/effect-cards';
import 'swiper/css';
import Store from './store/index.js'
// import { World } from './start.ts'

const Pinia  = Store()
const socket = io('ws://localhost:3000');

const isInput = computed(() => Pinia.useAppStore.getIsInpt)
const isShowCreateAvatar = ref(true)
let name = ref()
let users = reactive({
    list: []
})
let msg = ref("")
let msgData: any = reactive({
    list: []
})
let chatContent = ref()
const hotZoneData = ref(null)
const container = ref()
const playerCount = ref(0)
const glbModelPath = ref()
const roleList = [
'./1.glb',
'./2.glb',
'./3.glb'
];

const onSwiper = (swiper: any) => {
   console.log("swiper", swiper)
   glbModelPath.value = roleList[0]
} 

const onSlideChange = (e: any) => {
  let pageIndex = e.activeIndex;
  glbModelPath.value = roleList[pageIndex]
}
const handleClickCreateRandomName = () => {
    name.value = randomName()
}

const randomName = () => {
  const firstName = ["John", "Mary", "David", "Paul", "Mark", "James", "Michael", "Joseph", "Richard", "Charles",
              "Thomas", "Christopher","Daniel","Matthew","Anthony","Donald","Elizabeth","Kenneth","Susan","Margaret"];
  const lastName = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];

  const randomFirstNameIndex = Math.floor(Math.random() * firstName.length);
  const randomLastNameIndex = Math.floor(Math.random() * lastName.length);

  return `${firstName[randomFirstNameIndex]}-${lastName[randomLastNameIndex]}`;
}

onMounted(() => {
  socket.on('connect', () => console.log('connect: websocket 连接成功！'))
  // 监听系统消息
  socket.on('system', function (sysMsg: any, userList: any) {
    appendMsg("system", sysMsg)
    playerCount.value = userList.length
    users.list = userList
  });
  // 监听房间消息
  socket.on('roomMessage', function (userName: string, userMessage: any) {
    appendMsg(userName, userMessage)
  });
  name.value = randomName()
});
// 创建角色
const handleClickCreateAvatar = async () => {
  if(name.value && name.value !== 'undefined') {
    // 加入房间
    joinRoom(name.value)
    // getPlayerCount(socket)
    // socket.emit('broadcast', name.value);
    initThree(socket)
    isShowCreateAvatar.value = false

  }else{
    alert('请输入角色名称')
  }
}
// 加入房间
const joinRoom = (userName: string) => {
  socket.emit('join', userName);
}
// 初始化角色
const initThree = (socket: any) => {
  // const world = new World("./12.glb");
    // const containerObj = container.value
    // let config={
    //   playerName:name.value,
    //   socket:socket,
    //   hotZoneData:hotZoneData
    // }
    // if (containerObj) {
    //   renderAPI()
    //     .initialize(containerObj,config)
    //     .then((apiInstance: any) => {
    //       apiInstance.startRender();
    //     })
    //     .catch();
    // }
}
// 测试
const handleClickTest = () => {
  if(msg.value){
    socket.emit('roomMessage', msg.value);
    msg.value = ""
  }
}
// 滚动
const scrollToBottom = () => {
  nextTick(() => {
    let scrollElem = chatContent.value;
    scrollElem.scrollTo({
      top: scrollElem.scrollHeight,
      behavior: 'smooth'
    });
  });
}
// 是否再输入
const handleClickIsInpt = (e: any) => {
  Pinia.useAppStore.setIsInpt(e)
}

const appendMsg = (userName:string, userMessage:any) => {
  let msgDom: any = `<span class="cl-sendName">${userName}:&nbsp;</span> <span class="cl-sendMsg">${userMessage} </span>`
  msgData.list.push(msgDom)
  scrollToBottom()
}

</script>

<template>
  <div class="cl-create-avatar" v-if="isShowCreateAvatar">
     <div>
      <swiper
        :effect="'cards'"
        :grabCursor="true"
        :modules="EffectCards"
        @swiper="onSwiper"
        @slideChange="onSlideChange"
        class="mySwiper"
      >
        <swiper-slide>
          <img src="@/assets/images/1.png" />
        </swiper-slide>
        <swiper-slide>
          <img src="@/assets/images/2.png" />
        </swiper-slide>
        <swiper-slide>
          <img src="@/assets/images/3.png" />
        </swiper-slide>
      </swiper>
      <input v-model="name" class="name"/>
      &nbsp;&nbsp;
      <button @click="() => handleClickCreateRandomName()">随机名称</button>
      &nbsp;&nbsp;
      <button @click="() => handleClickCreateAvatar()">创建角色</button>
    </div>
  </div>
  <div class="cl-chat">
     <div class="cl-main"> 
         <div class="cl-chat-content" ref="chatContent">
          <p v-for="(item, index) in msgData.list" :key="index" >
             <span v-html="item"></span>
          </p>
         </div>
         <div class="cl-chat-form">
            <input type="text" class="cl-chat-msg" @blur="handleClickIsInpt(false)" @focus="handleClickIsInpt(true)"  @keyup.enter="handleClickTest" v-model="msg"  />
            <button class="cl-send-chat" >表情</button>
            <button class="cl-send-chat" @click="handleClickTest">语音</button>
            <button class="cl-send-chat" @click="handleClickTest">Send</button>
         </div>
     </div>
  </div>
  <div class="cl-online-users">
      <div class="cl-user-count">Online User {{  playerCount }}</div>
      <div class="cl-user-list">
        <ul>
           <li v-for="(item, index) in users.list" :key="index">{{ item }}</li> 
        </ul>
      </div>
  </div>
  <div id="container" class="container" ref="container">
  </div>
</template>

<style lang="stylus">
// chat style
.cl-chat {
  position: fixed
  width: 380px
  height: 380px
  bottom: 30px;
  left: 15px;
  border-radius: 18px
  background-color:rgba(0,0,0,0.2);
  padding: 17px
  .cl-chat-content {
    width: 380px
    height: 338px
    margin-bottom: 10px
    overflow-y: auto
    &::-webkit-scrollbar {
      width: 10px;  
      height: 1px;
    }
    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
      background: #535353;
    }
    &::-webkit-scrollbar-track {
      -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
      border-radius: 10px;
      background: #EDEDED;
    }
    p {
      span {
        font-family: 'Inter', sans-serif;
        color: #000000
        font-size:17px
        line-height: 25px
      }
      .cl-sendName{
        font-family: 'Inter', sans-serif;
        color: #ffffff
      }
      .cl-sendMsg {
        font-family: 'Inter', sans-serif;
        color: #ffffff
      }
    }
  }
  .cl-chat-form {
    display: flex
    justify-content: space-between
    .cl-chat-msg {
      width: 250px
      height: 0px
      background-color:rgba(0,0,0,0.5);
      padding: 15px
      color: #ffffff
      border-radius:18px
    }
    .cl-send-chat {
      width: 77px
      height: 30px
      background-color:rgba(0,0,0,0.5);
      color: #ffffff
      border-radius:18px
    }
  }
}

// online users style
.cl-online-users {
  position: fixed
  width: 150px
  height: 185px
  top: 20%;
  right: 15px;
  border-radius: 18px
  background-color:rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column
  .cl-user-count {
    font-family: 'Inter', sans-serif;
    color: #ffffff
    font-weight: bold
    text-align: center
    padding: 10px 10px 5px 10px
  }
  .cl-user-list {
    padding: 0 5px 5px 5px
    ul {
      height: 150px
      overflow-y: auto
      li {
        font-family: 'Inter', sans-serif;
        color: #05ff5e
        padding: 5px
        font-weight: 200
        text-align: left
        border-bottom: 1px dashed rgba(0,0,0,0.2);
      }
      &::-webkit-scrollbar {
        width: 10px;  
        height: 1px;
      }
      &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
        background: #535353;
      }
      &::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
        border-radius: 10px;
        background: #EDEDED;
      }
    }
  }
}

.swiper {
  width: 240px;
  height: 320px;
  margin-bottom: 16px
}

.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  img {
    width: 200px
  }
}

.swiper-slide:nth-child(1n) {
  background-color: #43a8e2
}

.swiper-slide:nth-child(2n) {
  background-color: #43a8e2
}

.swiper-slide:nth-child(3n) {
  background-color: #43a8e2
}

@keyframes lineAni {
  to {
     stroke-dashoffset: 0
  }
}
@keyframes fillAni {
  from {
    fill: transparent
  }
  to {
    fill: #ffffff
  }
}

@keyframes jump {
  0% {
    transform: translate3d(0, 0, 0);
    text-shadow: rgba(255, 255, 255, 0.4) 0 0 0.05em;
  }
  100% {
    transform: translate3d(0, -1em, 0);
    text-shadow: rgba(255, 255, 255, 0.4) 0 1em 0.35em;
  }
}

@font-face {
  font-family: scorefont;
  src: url('./assets/font/digital_number.ttf')
}

.cl-create-avatar {
  position: fixed;
  width: 100%
  height:  100%
  background: #000000;
  z-index: 999;
  display: flex
  justify-content: center
  align-items: center
  .name {

  }
}

* { 
  margin: 0;
  padding: 0;
}
#container {
  width: 100vw;
  height: 100vh;
}
</style>

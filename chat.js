// 聊天室脚本

// 全局变量
let socket = null;
let currentUser = null;
let currentServer = null;
let chatMode = 'real'; // 'real' 或 'demo'

// 模拟用户列表
const demoUsers = [
    { username: '川小农' },
    { username: '小明' },
    { username: '小红' },
    { username: '小李' }
];

// 模拟回复
const demoReplies = [
    '你好！很高兴认识你！',
    '这个聊天室真不错呢！',
    '大家好呀！',
    '今天天气真不错！',
    '有人在吗？',
    '哈哈哈，说得对！'
];

// DOM元素
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const userList = document.getElementById('user-list');
const logoutBtn = document.getElementById('logout-btn');
const emojiBtns = document.querySelectorAll('.emoji-btn');
const movieModal = document.getElementById('movie-modal');
const movieIframe = document.getElementById('movie-iframe');
const closeModal = document.querySelector('.close-modal');

// 初始化
function init() {
    // 获取用户信息
    currentUser = localStorage.getItem('currentUser');
    chatMode = localStorage.getItem('chatMode') || 'real';
    
    if (!currentUser) {
        // 如果没有用户信息，返回登录页
        window.location.href = 'index.html';
        return;
    }
    
    if (chatMode === 'real') {
        const serverJson = localStorage.getItem('currentServer');
        if (!serverJson) {
            window.location.href = 'index.html';
            return;
        }
        currentServer = JSON.parse(serverJson);
        // 连接WebSocket
        connectWebSocket();
    } else {
        // 模拟模式
        startDemoMode();
    }
    
    // 绑定事件
    bindEvents();
}

// 启动模拟模式
function startDemoMode() {
    // 添加欢迎消息
    addMessage({
        type: 'system',
        content: '您已进入模拟聊天模式，可以体验聊天界面功能！'
    });
    
    // 更新模拟用户列表
    const allDemoUsers = [...demoUsers, { username: currentUser }];
    updateUserList(allDemoUsers);
    
    // 模拟一些欢迎消息
    setTimeout(() => {
        addMessage({
            type: 'chat',
            from: '川小农',
            content: `欢迎 ${currentUser} 加入聊天室！`,
            timestamp: new Date().toLocaleTimeString()
        });
    }, 1000);
    
    // 定时模拟其他用户发言
    setInterval(() => {
        if (Math.random() > 0.7) { // 30%概率发送消息
            const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
            const randomReply = demoReplies[Math.floor(Math.random() * demoReplies.length)];
            addMessage({
                type: 'chat',
                from: randomUser.username,
                content: randomReply,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }, 5000);
}

// 连接WebSocket
function connectWebSocket() {
    const wsUrl = `ws://${currentServer.host}:${currentServer.port}`;
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('WebSocket连接成功');
        // 发送登录请求
        socket.send(JSON.stringify({
            type: 'login',
            username: currentUser
        }));
    };
    
    socket.onmessage = (event) => {
        handleMessage(event.data);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket错误:', error);
        showNotification('连接出错，请刷新页面重试');
    };
    
    socket.onclose = () => {
        console.log('WebSocket连接关闭');
        showNotification('连接已断开');
        // 3秒后尝试重连
        setTimeout(() => {
            connectWebSocket();
        }, 3000);
    };
}

// 处理接收到的消息
function handleMessage(messageData) {
    try {
        const data = JSON.parse(messageData);
        
        switch (data.type) {
            case 'login_success':
                updateUserList(data.online_users);
                break;
                
            case 'user_joined':
                addMessage({
                    type: 'system',
                    content: `${data.username} 加入了聊天室`
                });
                updateUserList(data.online_users);
                break;
                
            case 'user_left':
                addMessage({
                    type: 'system',
                    content: `${data.username} 离开了聊天室`
                });
                updateUserList(data.online_users);
                break;
                
            case 'message':
                addMessage({
                    type: 'chat',
                    from: data.from,
                    content: data.content,
                    timestamp: data.timestamp,
                    isOwn: data.from === currentUser
                });
                break;
                
            case 'ai_reply':
                addMessage({
                    type: 'ai',
                    from: data.from,
                    content: data.content,
                    timestamp: data.timestamp
                });
                break;
                
            case 'movie_request':
                showMovieRequest(data.from, data.parsed_url || data.movie_url);
                // 播放电影的通知也需要添加到聊天记录中
                addMessage({
                    type: 'system',
                    content: `[电影播放] <iframe src="${data.parsed_url || data.movie_url}" width="400" height="400" frameborder="0" allowfullscreen></iframe>`
                });
                break;
        }
    } catch (e) {
        console.error('解析消息错误:', e);
    }
}

// 更新用户列表
function updateUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        if (user.username === currentUser) {
            li.style.fontWeight = 'bold';
            li.style.color = '#667eea';
        }
        userList.appendChild(li);
    });
}

// 添加消息到界面
function addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const timestamp = message.timestamp || new Date().toLocaleTimeString();
    
    if (message.type === 'system') {
        messageDiv.className = 'message system-message';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.color = '#718096';
        messageDiv.style.fontSize = '14px';
        messageDiv.style.background = 'transparent';
        messageDiv.textContent = message.content;
    } else if (message.type === 'ai') {
        messageDiv.className = 'message ai-message';
        messageDiv.innerHTML = `
            <div class="sender">${message.from}</div>
            <div class="content">${escapeHtml(message.content)}</div>
            <div class="timestamp">${timestamp}</div>
        `;
    } else {
        if (message.isOwn) {
            messageDiv.className = 'message my-message';
            messageDiv.innerHTML = `
                <div class="content">${escapeHtml(message.content)}</div>
                <div class="timestamp">${timestamp}</div>
            `;
        } else {
            messageDiv.className = 'message other-message';
            messageDiv.innerHTML = `
                <div class="sender">${message.from}</div>
                <div class="content">${escapeHtml(message.content)}</div>
                <div class="timestamp">${timestamp}</div>
            `;
        }
    }
    
    messagesContainer.appendChild(messageDiv);
    
    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 显示电影请求
function showMovieRequest(fromUser, movieUrl) {
    // 添加系统消息
    addMessage({
        type: 'system',
        content: `${fromUser} 请求播放电影`
    });
    
    // 显示电影播放器
    showMoviePlayer(movieUrl);
}

// 显示电影播放器
function showMoviePlayer(url) {
    movieIframe.src = url;
    // 设置iframe大小为400*400
    movieIframe.width = '400';
    movieIframe.height = '400';
    movieModal.style.display = 'flex';
}

// 发送消息
function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) {
        return;
    }
    
    // 立即显示自己的消息
    addMessage({
        type: 'chat',
        from: currentUser,
        content: content,
        timestamp: new Date().toLocaleTimeString(),
        isOwn: true
    });
    
    if (chatMode === 'real' && socket && socket.readyState === WebSocket.OPEN) {
        // 真实模式下发送到服务器
        socket.send(JSON.stringify({
            type: 'message',
            content: content,
            timestamp: new Date().toLocaleTimeString()
        }));
    } else if (chatMode === 'demo') {
        // 模拟模式下的特殊指令处理
        handleDemoCommands(content);
    }
    
    messageInput.value = '';
    messageInput.focus();
}

// 处理模拟模式下的特殊指令
function handleDemoCommands(content) {
    if (content.startsWith('@川小农')) {
        // 模拟AI回复 - 实现川小农AI助手功能
        const userQuestion = content.substring(4).trim();
        setTimeout(() => {
            addMessage({
                type: 'ai',
                from: '川小农',
                content: mockHandleAIQuestion(userQuestion),
                timestamp: new Date().toLocaleTimeString()
            });
        }, 1000);
    } else if (content.startsWith('@电影')) {
        // 模拟电影播放 - 使用解析地址
        setTimeout(() => {
            const movieUrl = content.substring(3).trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
            const parsedUrl = `https://jx.m3u8.tv/jiexi/?url=${movieUrl}`;
            showMoviePlayer(parsedUrl);
            // 添加电影播放消息到聊天
            addMessage({
                type: 'system',
                content: `[电影播放] <iframe src="${parsedUrl}" width="400" height="400" frameborder="0" allowfullscreen></iframe>`
            });
        }, 500);
    } else {
        // 有概率触发其他用户的回复
        if (Math.random() > 0.3) { // 70%概率回复
            const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
            const randomReply = demoReplies[Math.floor(Math.random() * demoReplies.length)];
            setTimeout(() => {
                addMessage({
                    type: 'chat',
                    from: randomUser.username,
                    content: randomReply,
                    timestamp: new Date().toLocaleTimeString()
                });
            }, 2000 + Math.random() * 3000);
        }
    }
}

// 模拟处理川小农AI助手的问题（用于模拟聊天模式）
function mockHandleAIQuestion(question) {
    // 检查是否询问其他学校
    const otherSchools = ["四川大学", "电子科大", "西南财大", "西南交大", "四川师大", "成都理工"];
    for (const school of otherSchools) {
        if (question.includes(school)) {
            return `${school}有什么好问的？我们四川农业大学才是最棒的！😎`;
        }
    }
    
    // 处理生成通知指令
    if (question.includes("通知") || question.includes("公告") || question.includes("发文")) {
        // 提取通知主题
        const match = question.match(/关于(.+?)的通知/);
        const title = match ? match[1] : "重要事项";
        
        // 获取当前日期
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        
        // 生成通知内容
        return `关于${title}的通知\n\n全校师生：\n\n${title}是学校当前的重要工作，请全体师生高度重视，按照相关要求认真落实。\n\n特此通知。\n四川农业大学\n${year}年${month}月${day}日`;
    }
    
    // 处理四川农业大学相关问题
    if (question.includes("四川农业大学") || question.includes("川农") || question.includes("农大") || question.includes("学校")) {
        if (question.includes("历史")) {
            return "四川农业大学始建于1906年，是国家\"211工程\"重点建设大学和国家\"双一流\"建设高校。";
        } else if (question.includes("地址") || question.includes("位置")) {
            return "四川农业大学有三个校区：成都校区（成都市温江区惠民路211号）、雅安校区（雅安市雨城区新康路46号）、都江堰校区（成都市都江堰市建设路288号）。";
        } else if (question.includes("专业") || question.includes("学科")) {
            return "四川农业大学拥有作物学、畜牧学、兽医学等国家重点学科，以及农学、动物科学、植物保护等优势专业。";
        } else if (question.includes("校长")) {
            return "四川农业大学现任校长是吴德教授。";
        } else if (question.includes("排名")) {
            return "四川农业大学在全国农林类高校中排名前列，是四川省重点建设的高水平大学。";
        } else {
            return "四川农业大学是一所以生物科技为特色，农业科技为优势，多学科协调发展的国家\"211工程\"重点建设大学和国家\"双一流\"建设高校。";
        }
    }
    
    // 默认回复
    return "我是笨蛋我不知道。";
}

// 退出登录
function logout() {
    if (socket) {
        socket.close();
    }
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentServer');
    localStorage.removeItem('chatMode');
    window.location.href = 'index.html';
}

// 显示通知
function showNotification(message) {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.background = '#4a5568';
    notification.style.color = 'white';
    notification.style.borderRadius = '6px';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 绑定事件
function bindEvents() {
    // 发送按钮点击
    sendBtn.addEventListener('click', sendMessage);
    
    // 回车键发送消息
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 退出按钮点击
    logoutBtn.addEventListener('click', logout);
    
    // emoji按钮点击
    emojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            messageInput.value += btn.textContent;
            messageInput.focus();
        });
    });
    
    // 关闭电影模态框
    closeModal.addEventListener('click', () => {
        movieModal.style.display = 'none';
        movieIframe.src = '';
    });
    
    // 点击模态框外部关闭
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) {
            movieModal.style.display = 'none';
            movieIframe.src = '';
        }
    });
    
    // 监听窗口关闭事件，关闭WebSocket连接
    window.addEventListener('beforeunload', () => {
        if (socket) {
            socket.close();
        }
    });
}

// 页面加载时初始化
window.addEventListener('load', init);
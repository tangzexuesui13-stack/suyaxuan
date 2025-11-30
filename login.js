// 登录页面脚本

// 默认服务器配置
const defaultServers = [
    {"id": 1, "name": "本地服务器", "host": "localhost", "port": 8765},
    {"id": 2, "name": "局域网服务器", "host": "0.0.0.0", "port": 8765},
    {"id": 3, "name": "备用服务器", "host": "localhost", "port": 8766}
];

// DOM元素
const usernameInput = document.getElementById('username');
const serverSelect = document.getElementById('server');
const loginBtn = document.getElementById('login-btn');
const errorMessage = document.getElementById('error-message');

// 初始化服务器列表
function initServerList() {
    // 从localStorage加载保存的服务器配置
    let servers = JSON.parse(localStorage.getItem('servers')) || defaultServers;
    
    // 清空选择框
    serverSelect.innerHTML = '';
    
    // 添加服务器选项
    servers.forEach(server => {
        const option = document.createElement('option');
        option.value = JSON.stringify(server);
        option.textContent = server.name;
        serverSelect.appendChild(option);
    });
}

// 验证昵称
function validateUsername(username) {
    if (!username || username.trim().length === 0) {
        showError('请输入昵称');
        return false;
    }
    if (username.trim().length > 20) {
        showError('昵称长度不能超过20个字符');
        return false;
    }
    return true;
}

// 显示错误信息
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 3000);
}

// 登录处理
async function handleLogin() {
    const username = usernameInput.value;
    const selectedServerJson = serverSelect.value;
    
    // 验证输入
    if (!validateUsername(username)) {
        return;
    }
    
    try {
        const server = JSON.parse(selectedServerJson);
        const wsUrl = `ws://${server.host}:${server.port}`;
        
        // 创建WebSocket连接进行预验证
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
            // 发送登录请求
            socket.send(JSON.stringify({
                type: 'login',
                username: username.trim()
            }));
        };
        
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'login_success') {
                    // 登录成功，保存用户信息并跳转到聊天页面
                    localStorage.setItem('currentUser', username.trim());
                    localStorage.setItem('currentServer', selectedServerJson);
                    localStorage.setItem('chatMode', 'real');
                    window.location.href = 'chat.html';
                } else if (data.type === 'login_failed') {
                    showError(data.reason || '登录失败，请重试');
                }
            } catch (e) {
                showError('服务器响应异常');
            }
        };
        
        socket.onerror = () => {
            // 连接失败，提供模拟模式选项
            if (confirm('无法连接到服务器，是否进入模拟聊天模式？')) {
                localStorage.setItem('currentUser', username.trim());
                localStorage.setItem('chatMode', 'demo');
                window.location.href = 'chat.html';
            }
        };
        
        socket.onclose = () => {
            // 连接关闭，这里不做处理，因为登录成功后会跳转
        };
        
        // 设置连接超时
        setTimeout(() => {
            if (socket.readyState === WebSocket.CONNECTING) {
                socket.close();
                // 超时后提供模拟模式
                if (confirm('连接超时，是否进入模拟聊天模式？')) {
                    localStorage.setItem('currentUser', username.trim());
                    localStorage.setItem('chatMode', 'demo');
                    window.location.href = 'chat.html';
                }
            }
        }, 3000);
        
    } catch (e) {
        showError('登录过程中发生错误');
    }
}

// 事件监听
loginBtn.addEventListener('click', handleLogin);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// 页面加载时初始化
window.addEventListener('load', () => {
    initServerList();
    
    // 自动聚焦到昵称输入框
    usernameInput.focus();
});
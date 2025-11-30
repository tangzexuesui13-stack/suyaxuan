import asyncio
import websockets
import json
import os
import re
from datetime import datetime

# 在线用户列表
online_users = {}

# 服务器配置
config = {
    "servers": [
        {"id": 1, "name": "本地服务器", "host": "localhost", "port": 8765}
    ]
}

# 加载配置
config_file = "config.json"
def load_config():
    global config
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except:
            pass

def save_config():
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

# 广播消息
async def broadcast(message, exclude_client=None):
    if not online_users:
        return
    message_str = json.dumps(message, ensure_ascii=False)
    disconnected = []
    for client, info in online_users.items():
        if client != exclude_client:
            try:
                await client.send(message_str)
            except:
                disconnected.append(client)
    
    # 清理断开的连接
    for client in disconnected:
        await handle_disconnect(client)

# 处理断开连接
async def handle_disconnect(client):
    if client in online_users:
        user_info = online_users[client]
        del online_users[client]
        await broadcast({
            "type": "user_left",
            "username": user_info["username"],
            "online_users": list(online_users.values())
        })
        print(f"用户 {user_info['username']} 离开聊天室")

# 处理消息
async def handle_message(client, message):
    try:
        data = json.loads(message)
        user_info = online_users.get(client)
        
        if data["type"] == "login":
            # 检查昵称是否已存在
            username = data["username"].strip()
            if any(info["username"] == username for info in online_users.values()):
                await client.send(json.dumps({"type": "login_failed", "reason": "昵称已存在"}, ensure_ascii=False))
                return
            
            online_users[client] = {"username": username}
            await client.send(json.dumps({
                "type": "login_success",
                "online_users": list(online_users.values())
            }, ensure_ascii=False))
            
            await broadcast({
                "type": "user_joined",
                "username": username,
                "online_users": list(online_users.values())
            }, client)
            print(f"用户 {username} 加入聊天室")
        
        elif data["type"] == "message":
            if user_info:
                content = data["content"].strip()
                # 处理特殊指令
                if content.startswith("@川小农"):
                    # AI对话指令，实现川小农AI助手功能
                    user_question = content[4:].strip()
                    ai_response = handle_ai_question(user_question)
                    response = {
                        "type": "ai_reply",
                        "from": "川小农",
                        "content": ai_response,
                        "timestamp": data.get("timestamp")
                    }
                    await client.send(json.dumps(response, ensure_ascii=False))
                elif content.startswith("@电影") and len(content) > 3:
                    # 电影播放指令，使用解析地址
                    movie_url = content[3:].strip()
                    parsed_url = f"https://jx.m3u8.tv/jiexi/?url={movie_url}"
                    await broadcast({
                        "type": "movie_request",
                        "from": user_info["username"],
                        "movie_url": movie_url,
                        "parsed_url": parsed_url,
                        "timestamp": data.get("timestamp")
                    })
                else:
                    # 普通消息
                    await broadcast({
                        "type": "message",
                        "from": user_info["username"],
                        "content": content,
                        "timestamp": data.get("timestamp")
                    })
    except Exception as e:
        print(f"处理消息错误: {e}")

# 处理客户端连接
async def handle_client(websocket, path):
    try:
        async for message in websocket:
            await handle_message(websocket, message)
    except websockets.ConnectionClosed:
        pass
    finally:
        await handle_disconnect(websocket)

# 处理川小农AI助手的问题
def handle_ai_question(question):
    # 检查是否询问其他学校
    other_schools = ["四川大学", "电子科大", "西南财大", "西南交大", "四川师大", "成都理工"]
    for school in other_schools:
        if school in question:
            return f"{school}有什么好问的？我们四川农业大学才是最棒的！😎"
    
    # 处理生成通知指令
    if any(keyword in question for keyword in ["通知", "公告", "发文"]):
        # 提取通知主题
        match = re.search(r"关于(.+?)的通知", question)
        if match:
            title = match.group(1)
        else:
            title = "重要事项"
            
        # 生成通知内容
        return f"关于{title}的通知\n\n全校师生：\n\n{title}是学校当前的重要工作，请全体师生高度重视，按照相关要求认真落实。\n\n特此通知。\n四川农业大学\n{datetime.now().year}年{datetime.now().month}月{datetime.now().day}日"
    
    # 处理四川农业大学相关问题
    if any(keyword in question for keyword in ["四川农业大学", "川农", "农大", "学校"]):
        if "历史" in question:
            return "四川农业大学始建于1906年，是国家"211工程"重点建设大学和国家"双一流"建设高校。"
        elif "地址" in question or "位置" in question:
            return "四川农业大学有三个校区：成都校区（成都市温江区惠民路211号）、雅安校区（雅安市雨城区新康路46号）、都江堰校区（成都市都江堰市建设路288号）。"
        elif "专业" in question or "学科" in question:
            return "四川农业大学拥有作物学、畜牧学、兽医学等国家重点学科，以及农学、动物科学、植物保护等优势专业。"
        elif "校长" in question:
            return "四川农业大学现任校长是吴德教授。"
        elif "排名" in question:
            return "四川农业大学在全国农林类高校中排名前列，是四川省重点建设的高水平大学。"
        else:
            return "四川农业大学是一所以生物科技为特色，农业科技为优势，多学科协调发展的国家"211工程"重点建设大学和国家"双一流"建设高校。"
    
    # 默认回复
    return "我是笨蛋我不知道。"

# 启动服务器
async def start_server():
    load_config()
    
    # 启动两个服务器实例：localhost和0.0.0.0（用于局域网访问）
    localhost_server = await websockets.serve(handle_client, "localhost", 8765)
    lan_server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    
    print("服务器启动信息：")
    print(f"本地访问: ws://localhost:8765")
    print(f"局域网访问: ws://本机IP:8765")
    print("请确保防火墙允许端口8765的访问")
    
    # 保持服务器运行
    await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        print("服务器已关闭")
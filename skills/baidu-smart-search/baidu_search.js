#!/usr/bin/env node

/**
 * 百度智能搜索脚本
 * 调用百度千帆平台 AI 搜索 API 获取实时网络信息
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import { Buffer } from 'buffer';

// 解析命令行参数
const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key && value) {
    // 移除引号
    params[key] = value.replace(/^["']|["']$/g, '');
  }
});

// 获取参数
const query = params.query;
const apiKey = process.env.BAIDU_API_KEY || params.api_key;
const endpoint = process.env.BAIDU_ENDPOINT || 'https://qianfan.baidubce.com';

// 验证参数
if (!query) {
  console.error('错误：缺少必需参数 query');
  console.error('用法：node baidu_search.js query="搜索关键词" [api_key="your_key"]');
  process.exit(1);
}

if (!apiKey) {
  console.error('错误：未配置 API Key');
  console.error('请设置环境变量 BAIDU_API_KEY 或在参数中提供 api_key');
  process.exit(1);
}

// 构建请求体
const requestBody = JSON.stringify({
  model: 'ernie-4.5-turbo-128k',
  messages: [
    {
      role: 'user',
      content: query,
    },
  ],
  search_mode: 'auto',
  search_source: 'baidu_search_v2',
  resource_type_filter: [
    {
      type: 'web',
      top_k: 20,
    },
  ],
  max_completion_tokens: 8192,
  enable_deep_search: false,
  enable_corner_markers: false,
  stream: false,
});

// 构建请求选项
const url = new URL(`${endpoint}/v2/ai_search/chat/completions`);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(requestBody),
  },
};

// 发送请求
const protocol = url.protocol === 'https:' ? https : http;

const req = protocol.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`API 错误: ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }

    try {
      const response = JSON.parse(data);
      const content = response.choices?.[0]?.message?.content || '';
      const references = response.references || [];

      // 格式化输出
      console.log('\n## 搜索结果\n');
      console.log(content);

      if (references.length > 0) {
        console.log('\n### 参考资料\n');
        references.forEach((ref, idx) => {
          console.log(`${idx + 1}. [${ref.title || '来源'}](${ref.url})`);
          if (ref.content) {
            console.log(`   ${ref.content.substring(0, 150)}...`);
          }
        });
      }

    } catch (error) {
      console.error('解析响应失败:', error.message);
      console.error('原始响应:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('请求失败:', error.message);
  process.exit(1);
});

// 设置超时
req.setTimeout(30000, () => {
  console.error('请求超时（30秒）');
  req.destroy();
  process.exit(1);
});

// 发送请求体
req.write(requestBody);
req.end();
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量 - 相对于项目根目录
dotenv.config({ path: path.join(process.cwd(), '.env') });

// 数据库配置
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, 'src', 'entities', '*.entity{.ts,.js}')],
  synchronize: false,
});

// MCP Server
const server = new Server(
  {
    name: 'winai',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_teams',
        description: '查询所有团队列表，支持按名称模糊搜索',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: '搜索关键词，支持模糊匹配团队名称',
            },
          },
        },
      },
      {
        name: 'list_customers',
        description: '查询团队内的客户列表，支持按名称模糊搜索',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: '团队ID',
            },
            search: {
              type: 'string',
              description: '搜索关键词，支持模糊匹配客户名称',
            },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'list_customer_documents',
        description: '获取指定客户的文档列表',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
              description: '团队ID',
            },
            customerId: {
              type: 'string',
              description: '客户ID',
            },
          },
          required: ['teamId', 'customerId'],
        },
      },
      {
        name: 'get_document_content',
        description: '获取文档的完整内容',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: '文档ID',
            },
          },
          required: ['documentId'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // 确保数据库连接
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    switch (name) {
      case 'list_teams': {
        const { search } = args as { search?: string };

        let query = `
          SELECT id, name, description, created_at, updated_at
          FROM teams
          WHERE 1=1
        `;
        const params: any[] = [];

        if (search) {
          query += ` AND name ILIKE $1`;
          params.push(`%${search}%`);
        }

        query += ` ORDER BY updated_at DESC LIMIT 50`;

        const result = await dataSource.query(query, params);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_customers': {
        const { teamId, search } = args as { teamId: string; search?: string };

        let query = `
          SELECT id, name, industry, company_size, description, contact_info, created_at, updated_at
          FROM customers
          WHERE team_id = $1
        `;
        const params: any[] = [teamId];

        if (search) {
          query += ` AND name ILIKE $2`;
          params.push(`%${search}%`);
        }

        query += ` ORDER BY updated_at DESC LIMIT 50`;

        const result = await dataSource.query(query, params);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_customer_documents': {
        const { teamId, customerId } = args as { teamId: string; customerId: string };

        const query = `
          SELECT d.id, d.title, d.format, d.created_at, d.updated_at,
                 c.name as customer_name,
                 s.name as skill_name
          FROM documents d
          LEFT JOIN customers c ON d.customer_id = c.id
          LEFT JOIN skill_interactions si ON d.interaction_id = si.id
          LEFT JOIN skills s ON si.skill_id = s.id
          WHERE d.team_id = $1 AND d.customer_id = $2
          ORDER BY d.updated_at DESC LIMIT 50
        `;

        const result = await dataSource.query(query, [teamId, customerId]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_document_content': {
        const { documentId } = args as { documentId: string };

        const query = `
          SELECT id, title, content, format, created_at, updated_at
          FROM documents
          WHERE id = $1
        `;

        const result = await dataSource.query(query, [documentId]);

        if (result.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'Document not found',
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: result[0].content,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AISA Customer Docs MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

// 工具的统一形状:声明(name/description/parameters 发给模型)与执行(execute 留在本地)住一起
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema,告诉模型参数什么形状
  execute: (args: Record<string, unknown>) => Promise<string>;
}

import { IsOptional, IsObject, IsString, IsBoolean, IsArray } from 'class-validator';

export class ExecuteSkillMcpDto {
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  referenceDocumentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceDocumentIds?: string[];

  /**
   * 是否自动包含该客户已有的所有文档作为参考
   * 当为 true 时，会自动获取该客户的所有文档 ID 并传给技能执行
   * 默认为 true
   */
  @IsOptional()
  @IsBoolean()
  includeCustomerDocuments?: boolean = true;
}

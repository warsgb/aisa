import { IsString, MinLength } from 'class-validator';

export class CreateFollowupMcpDto {
  @IsString()
  @MinLength(1, { message: '跟进内容不能为空' })
  content: string;
}

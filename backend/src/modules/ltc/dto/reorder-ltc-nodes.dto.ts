import { IsArray, IsUUID } from 'class-validator';

export class ReorderLtcNodesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  node_ids: string[];
}

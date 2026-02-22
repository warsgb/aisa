import { IsString, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemLtcNodeDto } from './create-system-ltc-node.dto';

export class UpdateSystemLtcNodeDto extends PartialType(CreateSystemLtcNodeDto) {}

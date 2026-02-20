import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReviewTeamApplicationDto {
  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'EGI106' }) @IsString() ref: string;
  @ApiProperty() @IsString() clientId: string;
  @ApiProperty({ example: '4500012345' }) @IsString() poNumber: string;
  @ApiProperty() @IsString() officeId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() expediterId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() corridorId?: string;
  @ApiProperty({ enum: ['SEA', 'AIR', 'ROAD', 'MULTIMODAL'] }) @IsString() transportMode: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() incoterm?: string;
}

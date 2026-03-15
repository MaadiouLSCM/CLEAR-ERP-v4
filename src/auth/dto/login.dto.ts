import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'maadiou@lscmltd.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'clear2026' })
  @IsString()
  @MinLength(6)
  password: string;
}

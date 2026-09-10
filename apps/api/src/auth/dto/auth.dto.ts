import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class RegisterDto { @IsString() @MinLength(2) name!: string; @IsEmail() email!: string; @IsString() @MinLength(12) password!: string; @IsString() @MinLength(2) organizationName!: string; @IsOptional() @IsString() industry?: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
export class RefreshDto { @IsOptional() @IsString() refreshToken?: string; }

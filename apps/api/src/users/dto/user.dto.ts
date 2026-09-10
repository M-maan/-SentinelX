import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'; import { Role } from '../../database/entities/user.entity';
export class CreateUserDto { @IsString() @MinLength(2) name!: string; @IsEmail() email!: string; @IsString() @MinLength(12) password!: string; @IsEnum(Role) role!: Role; @IsOptional() @IsString() organizationId?: string; }
export class UpdateUserRoleDto { @IsEnum(Role) role!: Role; }

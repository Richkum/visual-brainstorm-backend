import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { BoardRole } from '../board.schema';

export class InviteUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsEnum(BoardRole)
  role!: Exclude<BoardRole, BoardRole.OWNER>;
}

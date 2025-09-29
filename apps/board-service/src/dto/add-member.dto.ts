import { IsEnum, IsString } from 'class-validator';
import { BoardRole } from '../board.schema';

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(BoardRole)
  role!: BoardRole;
}
